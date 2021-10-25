//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "./SharedStructs.sol";
import "./ERC20Safe.sol";
import "./access/RelayerRole.sol";

/**
@title Bridge
@author Elrond & AgileFreaks
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
contract Bridge is RelayerRole {
    /*============================ EVENTS ============================*/
    event QuorumChanged(uint256 quorum);

    /*========================= CONTRACT STATE =========================*/
    string private constant action = "CurrentPendingBatch";
    string private constant executeTransferAction = "ExecuteBatchedTransfer";
    string private constant prefix = "\x19Ethereum Signed Message:\n32";
    uint256 private constant minimumQuorum = 3;
    uint256 public batchSettleBlockCount = 40;

    uint256 public quorum;
    ERC20Safe private immutable safe;

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
    constructor(
        address[] memory board,
        uint256 initialQuorum,
        ERC20Safe erc20Safe
    ) {
        require(initialQuorum >= minimumQuorum, "Quorum is too low.");
        require(board.length >= initialQuorum, "The board should be at least the quorum size.");

        _addRelayers(board);

        quorum = initialQuorum;
        safe = erc20Safe;
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
        @notice Gets information about the current batch of deposits
        @return Batch which consists of:
        - batch nonce
        - timestamp
        - deposits List of the deposits included in this batch
        @dev Even if there are deposits in the Safe, the current batch might still return as empty. This is because it might not be final (not full, and not enough blocks elapsed)
    */
    function getNextPendingBatch() external view returns (Batch memory) {
        return safe.getNextPendingBatch();
    }

    /**
        @notice Marks all transactions from the batch with their execution status (Rejected or Executed).
        @dev This is for the Ethereum to Elrond flow
        @param batchNonceETHElrond Nonce for the batch. Should be equal to the nonce of the current batch. This identifies a batch created on the Ethereum chain toat bridges tokens from Ethereum to Elrond
        @param newDepositStatuses Array containing new statuses for all the transactions in the batch. Can only be Rejected or Executed statuses. Number of statuses must be equal to the number of transactions in the batch.
        @param signatures Signatures from all the relayers for the execution. This mimics a delegated multisig contract. For the execution to take place, there must be enough valid signatures to achieve quorum.
    */
    function finishCurrentPendingBatch(
        uint256 batchNonceETHElrond,
        DepositStatus[] calldata newDepositStatuses,
        bytes[] calldata signatures
    ) public onlyRelayer {
        for (uint256 i = 0; i < newDepositStatuses.length; i++) {
            require(
                newDepositStatuses[i] == DepositStatus.Executed || newDepositStatuses[i] == DepositStatus.Rejected,
                "Non-final state. Can only be Executed or Rejected"
            );
        }

        require(signatures.length >= quorum, "Not enough signatures to achieve quorum");

        Batch memory batch = safe.getNextPendingBatch();
        require(batch.nonce == batchNonceETHElrond, "Invalid batch nonce");

        _validateQuorum(signatures, _getHashedDepositData(abi.encode(batchNonceETHElrond, newDepositStatuses, action)));

        safe.finishCurrentPendingBatch(newDepositStatuses);
    }

    /**
        @notice Executes transfers that were signed by the relayers.
        @dev This is for the Elrond to Ethereum flow
        @dev Arrays here try to mimmick the structure of a batch. A batch represents the values from the same index in all the arrays.
        @param tokens Array containing all the token addresses that the batch interacts with. Can even contain duplicates.
        @param recipients Array containing all the destinations from the batch. Can be duplicates.
        @param amounts Array containing all the amounts that will be transfered.
        @param batchNonceElrondETH Nonce for the batch. This identifies a batch created on the Elrond chain that bridges tokens from Elrond to Ethereum
        @param signatures Signatures from all the relayers for the execution. This mimics a delegated multisig contract. For the execution to take place, there must be enough valid signatures to achieve quorum.
    */
    function executeTransfer(
        address[] calldata tokens,
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256 batchNonceElrondETH,
        bytes[] calldata signatures
    ) public onlyRelayer {
        require(signatures.length >= quorum, "Not enough signatures to achieve quorum");
        require(executedBatches[batchNonceElrondETH] == false, "Batch already executed");
        executedBatches[batchNonceElrondETH] = true;

        _validateQuorum(
            signatures,
            _getHashedDepositData(abi.encode(recipients, tokens, amounts, batchNonceElrondETH, executeTransferAction))
        );

        DepositStatus[] memory statuses = new DepositStatus[](tokens.length);
        for (uint256 j = 0; j < tokens.length; j++) {
            statuses[j] = safe.transfer(tokens[j], amounts[j], recipients[j])
                ? DepositStatus.Executed
                : DepositStatus.Rejected;
        }

        CrossTransferStatus storage crossStatus = crossTransferStatuses[batchNonceElrondETH];
        crossStatus.statuses = statuses;
        crossStatus.createdBlockNumber = block.number;
    }

    /**
        @notice Verifies if all the deposits within a batch are finalized (Executed or Rejected)
        @param batchNonceETHElrond Nonce for the batch.
        @return status for the batch. true - executed, false - pending (not executed yet)
    */
    function wasBatchFinished(uint256 batchNonceETHElrond) external view returns (bool) {
        Batch memory batch = safe.getBatch(batchNonceETHElrond);

        if (batch.deposits.length == 0) {
            return false;
        }

        for (uint256 i = 0; i < batch.deposits.length; i++) {
            if (
                batch.deposits[i].status != DepositStatus.Executed && batch.deposits[i].status != DepositStatus.Rejected
            ) {
                return false;
            }
        }

        return true;
    }

    /**
        @notice Only returns values if the cross transfers were executed some predefined time ago to ensure finality
        @param batchNonceElrondETH Nonce for the batch
        @return a list of statuses for each transfer in the batch provided
     */
    function getStatusesAfterExecution(uint256 batchNonceElrondETH) external view returns (DepositStatus[] memory) {
        CrossTransferStatus memory crossStatus = crossTransferStatuses[batchNonceElrondETH];
        require((crossStatus.createdBlockNumber + batchSettleBlockCount) <= block.number, "Statuses not final yet");

        return crossStatus.statuses;
    }

    function wasBatchExecuted(uint256 batchNonceElrondETH) external view returns (bool) {
        return executedBatches[batchNonceElrondETH];
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

            require(isRelayer(publicKey), "Not a recognized relayer");

            // Determine if we have multiple signatures from the same relayer
            uint256 si;
            for (si = 0; si < validSigners.length; si++) {
                if (validSigners[si] == address(0)) {
                    // We reached the end of the loop.
                    // This preserves the value of `si` which is used below
                    // as the first open position.
                    break;
                }

                require(publicKey != validSigners[si], "Multiple signatures from the same relayer");
            }
            // We save this signer in the first open position.
            validSigners[si] = publicKey;
            // END: Determine if we have multiple signatures from the same relayer

            signersCount++;
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
