//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract BridgeProxyTestContract {
    uint256 public count;
    address public bridgeProxy;

    constructor(address _bridgeProxy) {
        count = 0;
        bridgeProxy = _bridgeProxy;
    }

    function increment() public {
        count += 1;
    }

    function withdraw(address tokenAddress, uint256 amount) external {
        IERC20 token = IERC20(tokenAddress);
        // The test contract should be approved to spend the tokens on behalf of the bridgeProxy
        require(token.transferFrom(bridgeProxy, address(this), amount), "TransferFrom failed");
    }
}
