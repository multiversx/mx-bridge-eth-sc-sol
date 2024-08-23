//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "./lib/Pausable.sol";
import "./SharedStructs.sol";

contract BridgeProxy is Pausable {
    uint256 public constant MIN_GAS_LIMIT_FOR_SC_CALL = 10_000_000;
    uint256 public constant DEFAULT_GAS_LIMIT_FOR_REFUND_CALLBACK = 20_000_000;

    address public multiTransferAddress;
    address public bridgedTokensWrapperAddress;
    mapping(uint256 => MvxTransaction) public pendingTransactions;
    uint256 private lowestTxId;
    uint256 private currentTxId;

    constructor(address _multiTransferAddress) Pausable() {
        multiTransferAddress = _multiTransferAddress;
        lowestTxId = 1;
    }

    function deposit(MvxTransaction calldata txn) external payable whenNotPaused {
        require(msg.sender == multiTransferAddress, "BridgeProxy: Only MultiTransfer can do deposits");
        pendingTransactions[currentTxId] = txn;
        currentTxId++;
    }

    function execute(uint256 txId) external whenNotPaused {
        require(txId >= 0 && txId < currentTxId, "BridgeProxy: Invalid transaction ID");
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

            bytes memory data;
            if (args.length > 0) {
                data = abi.encodePacked(endpoint, args);
            } else {
                data = endpoint;
            }

            (bool success, ) = txn.recipient.call{ gas: gasLimit }(data);

            if (!success) {
                _executeCallback(txId);
                return;
            }
        } else {
            _finishExecuteGracefully(txId);
        }
    }

    function _executeCallback(uint256 txId) private {
        _refundTransaction(txId);

        if (txId < lowestTxId) {
            lowestTxId = txId + 1;
        }

        delete pendingTransactions[txId];
    }

    function _finishExecuteGracefully(uint256 txId) private {}

    function _refundTransaction(uint256 txId) private {}
}
