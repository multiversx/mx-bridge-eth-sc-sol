// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct CalledData {
    uint256 size;
    address addr;
    address tokenIdentifier;
}

contract TestCaller {
    CalledData[] private calledDataParams;

    constructor() {}

    function upgrade() public {}

    function callPayable() public payable {}

    function callNonPayable() public {}

    function callPayableWithParams(uint256 size, address addr, address tokenIdentifier) public payable {
        CalledData memory data = CalledData({ size: size, addr: addr, tokenIdentifier: tokenIdentifier });

        calledDataParams.push(data);
    }

    function getCalledDataParams() public view returns (CalledData[] memory) {
        return calledDataParams;
    }
}
