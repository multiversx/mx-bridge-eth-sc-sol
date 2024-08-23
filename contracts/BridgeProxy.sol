//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "./lib/Pausable.sol";
import "./SharedStructs.sol";

contract BridgeProxy is Pausable {
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
}
