//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "../Bridge.sol";

contract BridgeMock is Bridge {
    function initialize(address[] memory board, uint256 initialQuorum, ERC20Safe erc20Safe) public override initializer {
        Bridge.initialize(board, initialQuorum, erc20Safe);
    }

    function proxyTransfer(address tokenAddress, uint256 amount, address recipientAddress) external returns (bool) {
        return safe.transfer(tokenAddress, amount, recipientAddress);
    }
}
