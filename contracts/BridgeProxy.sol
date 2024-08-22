//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "./lib/Pausable.sol";
import "./SharedStructs.sol";

contract BridgeProxy is Pausable {
    address public multiTransferAddress;
    address public bridgedTokensWrapperAddress;
    MvxTransaction[] private pendingTransactions;
    mapping(uint256 => TokenPayment) private payments;
    uint256 private lowestTxId;

    constructor(address _multiTransferAddress) Pausable() {
        multiTransferAddress = _multiTransferAddress;
        lowestTxId = 1;
    }

    function deposit(MvxTransaction calldata txn) external payable whenNotPaused {
        require(msg.sender == multiTransferAddress, "BridgeProxy: Only MultiTransfer can do deposits");
        pendingTransactions.push(txn);
        payments[txId++] = TokenPayment(txn.token, txn.amount);
    }
}
