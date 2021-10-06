//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AFCoin is ERC20 {
    constructor(uint256 initialSupply_) ERC20("Agile Freaks Coin", "AFC") {
        _mint(msg.sender, initialSupply_);
    }

    function brrr() public {
        _mint(msg.sender, 200);
    }
}
