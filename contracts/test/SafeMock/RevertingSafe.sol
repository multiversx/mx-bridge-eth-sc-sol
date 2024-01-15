//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

contract RevertingSafe {
    function deposit(
        address tokenAddress,
        uint256 amount,
        bytes32 recipientAddress
    ) public {
        revert("reverting_safe");
    }
}
