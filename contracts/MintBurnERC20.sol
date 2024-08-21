//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { ERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";

contract MintBurnERC20 is ERC20Upgradeable, AccessControlUpgradeable, ERC20BurnableUpgradeable {
    // Create a new role identifier for the minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint8 private numDecimals;

    error CallerNotMinter(address caller);

    function initialize(string memory name, string memory symbol, uint8 providedNumDecimals) public initializer {
        __ERC20_init(name, symbol);
        __AccessControl_init();
        __ERC20Burnable_init();

        __MintBurnERC20__init_unchained(providedNumDecimals);
    }

    function __MintBurnERC20__init_unchained(uint8 providedNumDecimals) internal onlyInitializing {
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
