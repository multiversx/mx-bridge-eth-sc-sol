//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../ERC20Safe.sol";

contract SafeUpgrade is Initializable, ERC20Safe {
    uint256 public someValue;
    // New initialization function for the upgrade
    function initializeV2(uint256 val) public reinitializer(2) {
        someValue = val;
    }

    function afterUpgrade() public view returns(uint256) {
        return someValue;
    }
}
