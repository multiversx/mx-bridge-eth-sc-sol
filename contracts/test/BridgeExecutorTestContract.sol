//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract BridgeExecutorTestContract {
    uint256 public count;
    address public bridgeExecutor;

    constructor(address _bridgeExecutor) {
        count = 0;
        bridgeExecutor = _bridgeExecutor;
    }

    function increment() public {
        count += 1;
    }

    function withdraw(address tokenAddress, uint256 amount) external {
        IERC20 token = IERC20(tokenAddress);
        // The test contract should be approved to spend the tokens on behalf of the bridgeExecutor
        require(token.transferFrom(bridgeExecutor, address(this), amount), "TransferFrom failed");
    }
}
