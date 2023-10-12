pragma solidity ^0.8.4;

import "./ERC20Safe.sol";
import "./SharedStructs.sol";
import "./access/AdminRole.sol";

contract SCExecProxy is AdminRole {
    using SafeERC20 for IERC20;
    using BoolTokenTransfer for IERC20;

    ERC20Safe public safe;

    mapping(uint112 => DepositSCExtension) depositInfo;

    event ERC20SCDeposit(uint112 indexed batchNonce, string callData);

    constructor(ERC20Safe erc20Safe) {
        safe = erc20Safe;
    }

    function deposit(
        address tokenAddress,
        uint256 amount,
        bytes32 recipientAddress,
        string calldata callData
    ) public {
        IERC20 erc20 = IERC20(tokenAddress);
        erc20.safeTransferFrom(msg.sender, address(this), amount);

        erc20.approve(address(safe), amount);
        safe.deposit(tokenAddress, amount, recipientAddress);

        uint112 currentBatchId = safe.batchesCount();
        emit ERC20SCDeposit(currentBatchId, callData);
    }

    function setSafe(ERC20Safe erc20Safe) public onlyAdmin {
        safe = erc20Safe;
    }

    function isSafePaused() public view returns (bool) {
        return safe.paused();
    }
}
