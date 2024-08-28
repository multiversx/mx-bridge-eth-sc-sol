// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract Proxy is TransparentUpgradeableProxy {
    constructor(address _logic, address initialOwner, bytes memory _data) payable TransparentUpgradeableProxy(_logic, initialOwner, _data) {
    }
}
