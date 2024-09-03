//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MintBurnERC20 is ERC20, AccessControl, ERC20Burnable {
    // Create a new role identifier for the minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint8 private numDecimals;
    // Reserved storage slots for future upgrades
    uint256[10] private __gap;

    error CallerNotMinter(address caller);

    constructor(string memory name, string memory symbol, uint8 providedNumDecimals) ERC20(name, symbol) {
        numDecimals = providedNumDecimals;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public {
        // Check that the calling account has the minter role
        if (!hasRole(MINTER_ROLE, msg.sender)) {
            revert CallerNotMinter(msg.sender);
        }
        _mint(to, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return numDecimals;
    }
}
