//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./lib/Pausable.sol";
import "./SharedStructs.sol";
import "./lib/BoolTokenTransfer.sol";

contract BridgeProxy is Pausable {
    using BoolTokenTransfer for IERC20;

    uint256 public constant MIN_GAS_LIMIT_FOR_SC_CALL = 10_000_000;
    uint256 public constant DEFAULT_GAS_LIMIT_FOR_REFUND_CALLBACK = 20_000_000;

    address public bridgeAddress;
    mapping(uint256 => MvxTransaction) private pendingTransactions;
    mapping(uint256 => TokenPayment) private payments;
    uint256 private lowestTxId;
    uint256 private currentTxId;

    constructor(address _bridgeAddress) Pausable() {
        bridgeAddress = _bridgeAddress;
        lowestTxId = 1;
    }

    function deposit(MvxTransaction calldata txn) external payable whenNotPaused {
        require(msg.sender == bridgeAddress, "BridgeProxy: Only Bridge contract can do deposits");
        pendingTransactions[currentTxId] = txn;
        payments[currentTxId++] = TokenPayment(txn.token, txn.amount);
    }

    function execute(uint256 txId) external whenNotPaused {
        require(txId >= 0 && txId < currentTxId, "BridgeProxy: Invalid transaction ID");
        MvxTransaction memory txn = pendingTransactions[txId];
        TokenPayment memory payment = payments[txId];

        require(payment.amount != 0, "BridgeProxy: No amount bridged");

        if (txn.callData.length > 0) {
            (bytes memory endpoint, uint256 gasLimit, bytes memory args) = abi.decode(
                txn.callData,
                (bytes, uint256, bytes)
            );

            if (endpoint.length == 0 || gasLimit == 0 || gasLimit < MIN_GAS_LIMIT_FOR_SC_CALL) {
                _finishExecuteGracefully(txId);
                return;
            }

            bytes memory data = args.length > 0 ? abi.encodePacked(endpoint, args) : endpoint;

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

        if (txId < lowestTxId) {
            lowestTxId = txId + 1;
        }

        delete pendingTransactions[txId];
    }

    function _refundTransaction(uint256 txId) private {
        TokenPayment memory payment = payments[txId];
        MvxTransaction memory txn = pendingTransactions[txId];

        IERC20 erc20 = IERC20(payment.token);
        bool transferExecuted = erc20.boolTransfer(bridgeAddress, txn.amount);
        require(transferExecuted, "BridgeProxy: Refund failed");
    }

    function getPendingTransactionById(uint256 txId) public view returns (MvxTransaction memory) {
        return pendingTransactions[txId];
    }

    function getPendingTransaction() public view returns (MvxTransaction[] memory) {
        // Calculate the number of valid transactions
        uint256 validCount = 0;
        for (uint256 i = lowestTxId; i < currentTxId; i++) {
            if (pendingTransactions[i].amount != 0) {
                validCount++;
            }
        }

        MvxTransaction[] memory txns = new MvxTransaction[](validCount);
        uint256 index = 0;

        for (uint256 i = lowestTxId; i < currentTxId; i++) {
            if (pendingTransactions[i].amount != 0) {
                txns[index] = pendingTransactions[i];
                index++;
            }
        }

        return txns;
    }
}
