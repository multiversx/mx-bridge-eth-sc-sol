//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "../Bridge.sol";

contract BridgeMock is Bridge {
    constructor(
        address[] memory board,
        uint256 initialQuorum,
        ERC20Safe erc20Safe,
        BridgeProxy bridgeProxy
    ) Bridge(board, initialQuorum, erc20Safe, bridgeProxy) {}

    function proxyTransfer(address tokenAddress, uint256 amount, address recipientAddress) external returns (bool) {
        return safe.transfer(tokenAddress, amount, recipientAddress);
    }
}
