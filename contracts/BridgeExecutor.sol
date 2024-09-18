//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./lib/Pausable.sol";
import "./SharedStructs.sol";
import "./lib/BoolTokenTransfer.sol";
import "./access/AdminRole.sol";
import "./access/BridgeRole.sol";

contract BridgeExecutor is Initializable, Pausable, BridgeRole {
    using BoolTokenTransfer for IERC20;

    /*========================= CONTRACT STATE =========================*/
    uint128 public constant MIN_GAS_LIMIT_FOR_SC_CALL = 10_000_000;
    uint128 public constant DEFAULT_GAS_LIMIT_FOR_REFUND_CALLBACK = 20_000_000;
    uint256 private lowestTxId;
    uint256 private currentTxId;

    mapping(uint256 => MvxTransaction) private pendingTransactions;

    /*========================= PUBLIC API =========================*/
    function initialize() public initializer {
        __BridgeRole_init();
        __Pausable_init();
    }

    function __BridgeExecutor__init_unchained() internal onlyInitializing {
        lowestTxId = 0;
        currentTxId = 0;
    }

    function deposit(MvxTransaction calldata txn) external payable whenNotPaused onlyBridge returns (bool) {
        pendingTransactions[currentTxId] = txn;
        currentTxId++;

        IERC20 token = IERC20(txn.token);
        bool approvalSuccess = token.approve(txn.recipient, txn.amount);

        return approvalSuccess;
    }

    function execute(uint256 txId) external whenNotPaused {
        require(txId < currentTxId, "BridgeExecutor: Invalid transaction ID");
        MvxTransaction memory txn = pendingTransactions[txId];

        require(txn.recipient != address(0), "BridgeExecutor: Transaction does not exist");

        if (txn.callData.length == 0) {
            _refundAndDeleteTxn(txId);
            return;
        }

        (bytes memory selector, uint256 gasLimit, bytes memory args) = abi.decode(
            txn.callData,
            (bytes, uint256, bytes)
        );

        if (selector.length == 0 || gasLimit == 0 || gasLimit < MIN_GAS_LIMIT_FOR_SC_CALL) {
            _refundAndDeleteTxn(txId);
            return;
        }

        bytes memory data;
        if (args.length > 0) {
            data = abi.encodePacked(selector, args);
        } else {
            data = selector;
        }

        _updateLowestTxId();

        delete pendingTransactions[txId];

        (bool success, ) = txn.recipient.call{ gas: gasLimit }(data);

        if (!success) {
            _refundTransaction(txn.token, txn.amount);
            return;
        }
    }

    /*========================= PRIVATE API =========================*/
    function _refundAndDeleteTxn(uint256 txId) private {
        MvxTransaction memory txn = pendingTransactions[txId];
        _refundTransaction(txn.token, txn.amount);

        _updateLowestTxId();

        delete pendingTransactions[txId];
    }

    function _refundTransaction(address token, uint256 amount) private {
        IERC20 erc20 = IERC20(token);
        bool transferExecuted = erc20.boolTransfer(this.bridge(), amount);
        require(transferExecuted, "BridgeExecutor: Refund failed");
    }

    function _updateLowestTxId() private {
        uint256 newLowestTxId = lowestTxId;

        while (newLowestTxId < currentTxId && pendingTransactions[newLowestTxId].amount == 0) {
            newLowestTxId++;
        }

        lowestTxId = newLowestTxId;
    }

    function _isPendingTransaction(uint256 txId) private view returns (bool) {
        return pendingTransactions[txId].amount != 0;
    }

    /*========================= VIEW FUNCTIONS =========================*/
    function getPendingTransactionById(uint256 txId) public view returns (MvxTransaction memory) {
        return pendingTransactions[txId];
    }

    function getPendingTransactions() public view returns (MvxTransaction[] memory) {
        uint256 pendingTransactionsCount = currentTxId - lowestTxId;
        MvxTransaction[] memory txns = new MvxTransaction[](pendingTransactionsCount);
        uint256 index = 0;

        for (uint256 i = lowestTxId; i < currentTxId; i++) {
            if (_isPendingTransaction(i)) {
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
