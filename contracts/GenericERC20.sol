//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GenericERC20 is ERC20 {
    constructor(string memory tokenName, string memory tokenSymbol) ERC20(tokenName, tokenSymbol) {}

    function mint(address recipientAddress, uint256 amount) external {
        _mint(recipientAddress, amount * (10**decimals()));
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
