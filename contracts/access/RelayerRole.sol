// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "../utils/structs/EnumerableSet.sol";
import "./AdminRole.sol";

/**
 * @title Operator Role Contract
 * @dev Simple role contract. Used for adding/removing operators
 */
contract RelayerRole is AdminRole {
    using EnumerableSet for EnumerableSet.AddressSet;

    event RelayerAdded(address indexed account, address indexed sender);
    event RelayerRemoved(address indexed account, address indexed sender);

    EnumerableSet.AddressSet private _relayers;

    /**
     * @dev Throws if called by any account other than the bridge.
     */
    modifier onlyRelayer() {
        require(isRelayer(msg.sender), "Access Control: sender is not Relayer");
        _;
    }

    function addRelayer(address account) external onlyAdmin {
        _addRelayer(account);
    }

    function removeRelayer(address account) external onlyAdmin {
        _removeRelayer(account);
    }

    function renounceRelayer(address account) external {
        require(account == msg.sender, "RelayerRole: can only renounce role for self");

        _removeRelayer(account);
    }

    function isRelayer(address account) public view returns (bool) {
        return _relayers.contains(account);
    }

    /**
     * TODO: Either keep the functions for iteration (getRelayer and getRelayersCount) or getRelayers
     *       Keeping both creates redundancy and increases gas costs
     */
    function getRelayer(uint256 index) external view returns (address) {
        return _relayers.at(index);
    }

    function getRelayers() external view returns (address[] memory) {
        return _relayers._values;
    }

    function getRelayersCount() external view returns (uint256) {
        return _relayers.length();
    }

    /**
     * @notice This should only be used on setup
     */
    function _addRelayers(address[] memory accounts) internal {
        for (uint256 i = 0; i < accounts.length; i++) {
            _addRelayer(accounts[i]);
        }
    }

    function _addRelayer(address account) private {
        _validateAddress(account);
        require(_relayers.add(account), "RelayerRole: address is already a relayer");
        emit RelayerAdded(account, msg.sender);
    }

    function _removeRelayer(address account) private {
        require(_relayers.remove(account), "RelayerRole: address is not a relayer");
        emit RelayerRemoved(account, msg.sender);
    }

    function _validateAddress(address account) internal pure {
        require(account != address(0), "RelayerRole: account cannot be the 0 address");
    }
}
