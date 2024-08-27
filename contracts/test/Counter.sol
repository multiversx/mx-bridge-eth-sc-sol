//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;

    constructor() {
        count = 0;
    }

    function increment() public {
        count += 1;
    }
}
