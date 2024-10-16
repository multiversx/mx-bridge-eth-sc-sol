//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ApproveNonZeroERC20 is ERC20 {
    uint8 private numDecimals;

    error ERC20ApproveNonZero(address spender, address owner, uint256 allowance);

    constructor(string memory tokenName, string memory tokenSymbol, uint8 providedNumDecimals) ERC20(tokenName, tokenSymbol) {
        numDecimals = providedNumDecimals;
    }

    function mint(address recipientAddress, uint256 amount) external {
        _mint(recipientAddress, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return numDecimals;
    }

    function approve(address spender, uint256 value) public override returns (bool) {
        address owner = _msgSender();
        uint256 allowance = allowance(owner, spender);
        if (allowance != 0 && value != 0) {
            revert ERC20ApproveNonZero(spender, owner, allowance);
        }
        _approve(owner, spender, value);
        return true;
    }
}
