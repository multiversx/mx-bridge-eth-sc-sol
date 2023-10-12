//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./access/AdminRole.sol";

/**
 * @dev Collection of functions related to the address type
 */
library AddressLib {
    /**
     * @dev Returns true if `account` is a contract.
     */
    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}

contract MintBurnERC20 is ERC20, AdminRole {
    using AddressLib for address;
    uint8 private _decimals = 18;
    address private _safe;

    constructor(string memory tokenName, string memory tokenSymbol, uint8 numDecimals) ERC20(tokenName, tokenSymbol) {
        _decimals = numDecimals;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        if (sender == _safe) {
            _mint(recipient, amount);
            return false;
        } else if (recipient == _safe) {
            _burn(sender, amount);
            return false;
        } else {
            return super.transferFrom(sender, recipient, amount);
        }
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        address sender = _msgSender();
        if (sender == _safe) {
            _mint(recipient, amount);
            return false;
        } else if (recipient == _safe) {
            _burn(sender, amount);
            return false;
        } else {
            return super.transfer(recipient, amount);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Transfers safe role of the contract to a new account (`newSafe`).
     * Can only be called by the admin.
     */
    function setSafe(address newSafe) public onlyAdmin {
        require(newSafe != address(0), "New safe is the zero address");
        require(newSafe != _safe, "Same address");
        require(newSafe.isContract(), "New safe must be a contract");

        _safe = newSafe;
    }
}
