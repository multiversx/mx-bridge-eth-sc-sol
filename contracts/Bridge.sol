//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./SharedStructs.sol";
import "./ERC20Safe.sol";
import "./access/RelayerRole.sol";
import "./lib/Pausable.sol";

/**
@title Bridge
@author MultiversX
@notice Contract to be used by the bridge relayers,
to get information and execute batches of transactions
to be bridged.
@notice Implements access control.
The deployer is also the admin of the contract.
In order to use it:
- relayers need to first be whitelisted
- the ERC20 safe contract must be deployed
- the safe must be setup to work in conjunction with the bridge (whitelisting)
@dev This contract mimics a multisign contract by sending the signatures from all
relayers with the execute call, in order to save gas.
 */
contract Bridge is RelayerRole, Pausable {
    /*============================ EVENTS ============================*/
    event QuorumChanged(uint256 quorum);

    /*========================= CONTRACT STATE =========================*/
    string private constant action = "CurrentPendingBatch";
    string private constant executeTransferAction = "ExecuteBatchedTransfer";
    string private constant prefix = "\x19Ethereum Signed Message:\n32";
    uint256 private constant minimumQuorum = 3;
    uint256 public batchSettleBlockCount;

    uint256 public quorum;
    ERC20Safe internal safe;

    mapping(uint256 => bool) public executedBatches;
    mapping(uint256 => CrossTransferStatus) public crossTransferStatuses;

    /*========================= PUBLIC API =========================*/

    /**
     * @dev whoever deploys the contract is the admin
     * Admin Role means that it can:
     *   - adjust access control
     *   - add/remove relayers
     *   - add/remove tokens that can be bridged
     */
    function initialize(address[] memory board, uint256 initialQuorum, ERC20Safe erc20Safe) public virtual initializer {
        __RelayerRole_init();
        __Bridge__init_unchained(board, initialQuorum, erc20Safe);
    }

    function __Bridge__init_unchained(address[] memory board, uint256 initialQuorum, ERC20Safe erc20Safe) internal onlyInitializing {
        require(initialQuorum >= minimumQuorum, "Quorum is too low.");
        require(board.length >= initialQuorum, "The board should be at least the quorum size.");

        _addRelayers(board);

        quorum = initialQuorum;
        safe = erc20Safe;

        batchSettleBlockCount = 40;
    }

    /**
        @notice Modifies the quorum that is needed to validate executions
        @param newQuorum Number of valid signatures required for executions.
    */
    function setQuorum(uint256 newQuorum) external onlyAdmin {
        require(newQuorum >= minimumQuorum, "Quorum is too low.");
        quorum = newQuorum;
        emit QuorumChanged(newQuorum);
    }

    /**
     @notice Updates the settle number limit used to determine if a batch is final
     @param newBatchSettleLimit New block settle limit that will be set until a batch is considered final
    */
    function setBatchSettleLimit(uint8 newBatchSettleLimit) external onlyAdmin whenPaused {
        require(!safe.isAnyBatchInProgress(), "Cannot change batchSettleBlockCount with pending batches");
        batchSettleBlockCount = newBatchSettleLimit;
    }

    /**
        @notice Gets information about the batch
        @return Batch which consists of:
        - batch nonce
        - blockNumber
        - depositsCount
        @dev Even if there are deposits in the Safe, the current batch might still return the count as 0. This is because it might not be final (not full, and not enough blocks elapsed)
    */
    function getBatch(uint256 batchNonce) external view returns (Batch memory, bool isBatchFinal) {
        return safe.getBatch(batchNonce);
    }

    /**
        @notice Gets information about the deposits from a batch
    */
    function getBatchDeposits(uint256 batchNonce) external view returns (Deposit[] memory, bool areDepositsFinal) {
        return safe.getDeposits(batchNonce);
    }

    /**
        @notice Executes transfers that were signed by the relayers.
        @dev This is for the MultiversX to Ethereum flow
        @dev Arrays here try to mimmick the structure of a batch. A batch represents the values from the same index in all the arrays.
        @param tokens Array containing all the token addresses that the batch interacts with. Can even contain duplicates.
        @param recipients Array containing all the destinations from the batch. Can be duplicates.
        @param amounts Array containing all the amounts that will be transfered.
        @param batchNonceMvx Nonce for the batch. This identifies a batch created on the MultiversX chain that bridges tokens from MultiversX to Ethereum
        @param signatures Signatures from all the relayers for the execution. This mimics a delegated multisig contract. For the execution to take place, there must be enough valid signatures to achieve quorum.
    */
    function executeTransfer(
        address[] calldata tokens,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256[] calldata depositNonces,
        uint256 batchNonceMvx,
        bytes[] calldata signatures
    ) public whenNotPaused onlyRelayer {
        require(signatures.length >= quorum, "Not enough signatures to achieve quorum");
        require(executedBatches[batchNonceMvx] == false, "Batch already executed");
        executedBatches[batchNonceMvx] = true;

        _validateQuorum(
            signatures,
            _getHashedDepositData(
                abi.encode(recipients, tokens, amounts, depositNonces, batchNonceMvx, executeTransferAction)
            )
        );

        DepositStatus[] memory statuses = new DepositStatus[](tokens.length);
        for (uint256 j = 0; j < tokens.length; j++) {
            statuses[j] = safe.transfer(tokens[j], amounts[j], recipients[j])
                ? DepositStatus.Executed
                : DepositStatus.Rejected;
        }

        CrossTransferStatus storage crossStatus = crossTransferStatuses[batchNonceMvx];
        crossStatus.statuses = statuses;
        crossStatus.createdBlockNumber = block.number;
    }

    /**
        @notice Only returns values if the cross transfers were executed some predefined time ago to ensure finality
        @param batchNonceMvx Nonce for the batch
        @return a list of statuses for each transfer in the batch provided
     */
    function getStatusesAfterExecution(uint256 batchNonceMvx) external view returns (DepositStatus[] memory, bool isFinal) {
        CrossTransferStatus memory crossStatus = crossTransferStatuses[batchNonceMvx];
        return (crossStatus.statuses, _isMvxBatchFinal(crossStatus.createdBlockNumber));
    }

    function _isMvxBatchFinal(uint256 createdBlockNumber) private view returns (bool) {
        if (createdBlockNumber == 0) {
            return false;
        }

        return (createdBlockNumber + batchSettleBlockCount) <= block.number;
    }

    function wasBatchExecuted(uint256 batchNonceMvx) external view returns (bool) {
        return executedBatches[batchNonceMvx];
    }

    /*========================= PRIVATE API =========================*/
    function _getHashedDepositData(bytes memory encodedData) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(prefix, keccak256(encodedData)));
    }

    function _validateQuorum(bytes[] memory signatures, bytes32 data) private view {
        uint256 signersCount;
        address[] memory validSigners = new address[](signatures.length);

        for (uint256 i = 0; i < signatures.length; i++) {
            address publicKey = _recover(signatures[i], data);
            if (!isRelayer(publicKey)) {
                continue;
            }

            // Determine if we have multiple signatures from the same relayer
            bool signerExists = false;
            for (uint256 si = 0; si < validSigners.length; si++) {
                if (validSigners[si] == publicKey) {
                    signerExists = true;
                    break;
                }
            }

            if (!signerExists) {
                signersCount++;
                validSigners[i] = publicKey;
            }
        }

        require(signersCount >= quorum, "Quorum was not met");
    }

    function _recover(bytes memory signature, bytes32 data) private pure returns (address) {
        require(signature.length == 65, "Malformed signature");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(signature, 32))
            // second 32 bytes
            s := mload(add(signature, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(signature, 96)))
        }

        // adjust recoverid (v) for geth cannonical values of 0 or 1
        // as per Ethereum's yellow paper: Appendinx F (Signing Transactions)
        if (v == 0 || v == 1) {
            v += 27;
        }

        return ecrecover(data, v, r, s);
    }
}
