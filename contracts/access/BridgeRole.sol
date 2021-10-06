// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "./AdminRole.sol";

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

/**
 * @title Operator Role Contract
 * @dev Simple role contract. Used for adding/removing operators
 */
contract BridgeRole is AdminRole {
    using AddressLib for address;

    address private _bridge;

    event BridgeTransferred(address indexed previousBridge, address indexed newBridge);

    /**
     * @dev Returns the address of the current bridge.
     */
    function bridge() public view returns (address) {
        return _bridge;
    }

    /**
     * @dev Throws if called by any account other than the bridge.
     */
    modifier onlyBridge() {
        require(bridge() == msg.sender, "Access Control: sender is not Bridge");
        _;
    }

    /**
     * @dev Transfers bridge role of the contract to a new account (`newBridge`).
     * Can only be called by the current bridge.
     */
    function setBridge(address newBridge) public onlyAdmin {
        require(newBridge != address(0), "BridgeRole: new bridge is the zero address");
        require(newBridge != _bridge, "BridgeRole: same address");
        require(newBridge.isContract(), "BridgeRole: new bridge must be a contract");

        emit BridgeTransferred(_bridge, newBridge);
        _bridge = newBridge;
    }
}
