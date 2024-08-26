//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./lib/Pausable.sol";
import "./SharedStructs.sol";
import "./lib/BoolTokenTransfer.sol";
import "./access/AdminRole.sol";
import "./access/BridgeRole.sol";

contract BridgeProxy is Pausable, BridgeRole {
    using BoolTokenTransfer for IERC20;

    uint256 public constant MIN_GAS_LIMIT_FOR_SC_CALL = 10_000_000;
    uint256 public constant DEFAULT_GAS_LIMIT_FOR_REFUND_CALLBACK = 20_000_000;

    mapping(uint256 => MvxTransaction) private pendingTransactions;
    uint256 private lowestTxId;
    uint256 private currentTxId;

    constructor() Pausable() {
        lowestTxId = 0;
    }

    function deposit(MvxTransaction calldata txn) external payable whenNotPaused onlyBridge {
        pendingTransactions[currentTxId] = txn;
        currentTxId++;
    }

    function execute(uint256 txId) external whenNotPaused {
        require(txId < currentTxId, "BridgeProxy: Invalid transaction ID");
        MvxTransaction memory txn = pendingTransactions[txId];

        require(txn.amount != 0, "BridgeProxy: No amount bridged");

        if (txn.callData.length > 0) {
            (bytes memory endpoint, uint256 gasLimit, bytes memory args) = abi.decode(
                txn.callData,
                (bytes, uint256, bytes)
            );

            if (endpoint.length == 0 || gasLimit == 0 || gasLimit < MIN_GAS_LIMIT_FOR_SC_CALL) {
                _finishExecuteGracefully(txId);
                return;
            }

            // Convert endpoint from bytes to bytes4 (function selector)
            bytes4 selector;
            assembly {
                selector := mload(add(endpoint, 32))
            }

            bytes memory data;
            if (args.length > 0) {
                data = abi.encodePacked(selector, args);
            } else {
                // Create a bytes memory array with the length of 4 (for bytes4)
                data = new bytes(4);
                assembly {
                    mstore(add(data, 32), selector) // Store the selector in the bytes array
                }
            }
            (bool success, ) = txn.recipient.call{ gas: gasLimit }(data);

            if (!success) {
                _finishExecuteGracefully(txId);
                return;
            }
        } else {
            _finishExecuteGracefully(txId);
        }
    }

    function _finishExecuteGracefully(uint256 txId) private {
        _refundTransaction(txId);
        _updateLowestTxId();

        delete pendingTransactions[txId];
    }

    function _refundTransaction(uint256 txId) private {
        MvxTransaction memory txn = pendingTransactions[txId];

        IERC20 erc20 = IERC20(txn.token);
        bool transferExecuted = erc20.boolTransfer(this.bridge(), txn.amount);
        require(transferExecuted, "BridgeProxy: Refund failed");
    }

    function _updateLowestTxId() private {
        uint256 newLowestTxId = lowestTxId;

        while (newLowestTxId < currentTxId && pendingTransactions[newLowestTxId].amount == 0) {
            newLowestTxId++;
        }

        lowestTxId = newLowestTxId;
    }

    function getPendingTransactionById(uint256 txId) public view returns (MvxTransaction memory) {
        return pendingTransactions[txId];
    }

    function getPendingTransaction() public view returns (MvxTransaction[] memory) {
        uint256 pendingTransactionsCount = currentTxId - lowestTxId;
        MvxTransaction[] memory txns = new MvxTransaction[](pendingTransactionsCount);
        uint256 index = 0;

        for (uint256 i = lowestTxId; i < currentTxId; i++) {
            if (pendingTransactions[i].amount != 0) {
                txns[index] = pendingTransactions[i];
                index++;
            }
        }

        // Resize the array to the actual number of pending transactions
        assembly {
            mstore(txns, index)
        }

        return txns;
    }
}
