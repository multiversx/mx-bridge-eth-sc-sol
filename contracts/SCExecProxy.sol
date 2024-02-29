pragma solidity ^0.8.20;

import "./ERC20Safe.sol";
import "./SharedStructs.sol";
import "./access/AdminRole.sol";

contract SCExecProxy is AdminRole {
    using SafeERC20 for IERC20;
    using BoolTokenTransfer for IERC20;

    ERC20Safe public safe;

    mapping(uint112 => DepositSCExtension) depositInfo;

    event ERC20SCDeposit(uint64 indexed batchNonce, uint64 depositNonce, string callData);

    constructor(ERC20Safe erc20Safe) {
        safe = erc20Safe;
    }

    /**
     * @notice Deposits ERC20 tokens into a contract and initiates a cross-chain transaction.
     * @dev This function transfers ERC20 tokens from the caller to this contract, approves them for the `safe` contract,
     * and then calls the `safe.deposit` method to handle the cross-chain transfer logic.
     *
     * The `callData` parameter is structured to include the endpoint name, gas limit, and arguments for the cross-chain call.
     *
     * @param tokenAddress The address of the ERC20 token to deposit.
     * @param amount The amount of tokens to deposit.
     * @param recipientAddress The address on the target chain to receive the tokens.
     * @param callData The encoded data specifying the cross-chain call details. The expected format is:
     *        0x01 + endpoint_name_length (4 bytes) + endpoint_name + gas_limit (8 bytes) +
     *        num_arguments_length (4 bytes) + [argument_length (4 bytes) + argument]...
     *        This payload includes the endpoint name, gas limit for the execution, and the arguments for the call.
     */
    function deposit(address tokenAddress, uint256 amount, bytes32 recipientAddress, string calldata callData) public {
        IERC20 erc20 = IERC20(tokenAddress);
        erc20.safeTransferFrom(msg.sender, address(this), amount);

        erc20.approve(address(safe), amount);
        safe.deposit(tokenAddress, amount, recipientAddress);

        uint64 currentBatchId = safe.batchesCount();
        uint64 currentDepositNonce = safe.depositsCount();
        emit ERC20SCDeposit(currentBatchId, currentDepositNonce, callData);
    }

    function setSafe(ERC20Safe erc20Safe) public onlyAdmin {
        safe = erc20Safe;
    }

    function isSafePaused() public view returns (bool) {
        return safe.paused();
    }
}
