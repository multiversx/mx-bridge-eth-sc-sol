//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "../GenericERC20.sol";

contract EvilERC20 is GenericERC20 {
    constructor(string memory tokenName, string memory tokenSymbol) GenericERC20(tokenName, tokenSymbol, 6) {}

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        return false;
    }
}
