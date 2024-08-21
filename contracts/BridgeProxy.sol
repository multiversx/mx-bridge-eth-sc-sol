//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "./lib/Pausable.sol";

contract BridgeProxy is Pausable {
    address public multiTransferAddress;
    address public bridgedTokensWrapperAddress;
    MvxTransaction[] private pendingTransactions;
    mapping(uint256 => TokenPayment) private payments;
    uint256 private lowestTxId;

    struct MvxTransaction {
        address sender;
        address recipient;
        address tokenAddress;
        uint256 amount;
        uint256 nonce;
    }

    struct TokenPayment {
        address tokenAddress;
        uint256 value;
    }

    constructor(address _multiTransferAddress) Pausable() {
        multiTransferAddress = _multiTransferAddress;
        lowestTxId = 1;
    }
}
