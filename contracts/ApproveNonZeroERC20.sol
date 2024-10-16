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

    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        if (_allowances[owner][spender] != 0) {
            revert ERC20ApproveNonZero(owner, spender, _allowances[owner][spender]);
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(owner, spender, value);
        }
    }
}
