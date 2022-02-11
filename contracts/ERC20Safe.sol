//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SharedStructs.sol";
import "./access/BridgeRole.sol";
import "./lib/BoolTokenTransfer.sol";

/**
@title ERC20 Safe for bridging tokens
@author Elrond
@notice Contract to be used by the users to make deposits that will be bridged
In order to use it:
- The Bridge.sol must be deployed and must be whitelisted for the Safe contract.
@dev The deposits are requested by the Bridge, and in order to save gas spent by the relayers
they will be batched either by time (batchTimeLimit) or size (batchSize).
 */
contract ERC20Safe is BridgeRole {
    using SafeERC20 for IERC20;
    using BoolTokenTransfer for IERC20;

    uint256 public depositsCount;
    uint256 public batchesCount;
    uint256 public batchTimeLimit = 10 minutes;
    uint256 public batchSettleLimit = 10 minutes;

    uint256 public batchSize = 10;
    uint256 private constant maxBatchSize = 100;

    mapping(uint256 => Batch) public batches;
    mapping(address => bool) public whitelistedTokens;
    mapping(address => uint256) public tokenLimits;
    mapping(address => uint256) public tokenBalances;

    event ERC20Deposit(uint256 depositNonce, uint256 batchId);

    /**
      @notice Whitelist a token. Only whitelisted tokens can be bridged.
      @param token Address of the ERC20 token that will be whitelisted
      @param minimumAmount Number that specifies the minimum number of tokens that the user has to deposit - to also cover for fees
      @notice emits {TokenWhitelisted} event
   */
    function whitelistToken(address token, uint256 minimumAmount) external onlyAdmin {
        whitelistedTokens[token] = true;
        tokenLimits[token] = minimumAmount;
    }

    /**
     @notice Remove a token from the whitelist
     @param token Address of the ERC20 token that will be removed from the whitelist
    */
    function removeTokenFromWhitelist(address token) external onlyAdmin {
        whitelistedTokens[token] = false;
    }

    /**
     @notice Checks weather a token is whitelisted
     @param token Address of the ERC20 token we are checking
    */
    function isTokenWhitelisted(address token) external view returns (bool) {
        return whitelistedTokens[token];
    }

    /**
     @notice Updates the time limit used to check if a batch is finalized for processing
     @param newBatchTimeLimit New time limit that will be set until a batch is considered final
    */
    function setBatchTimeLimit(uint256 newBatchTimeLimit) external onlyAdmin {
        if (newBatchTimeLimit > batchTimeLimit && batches[batchesCount - 1].deposits.length > 0) {
            batchesCount++;
        }
        batchTimeLimit = newBatchTimeLimit;
    }

    /**
     @notice Updates the maximum number of deposits accepted in a batch
     @param newBatchSize New number of deposits until the batch is considered full
    */
    function setBatchSize(uint256 newBatchSize) external onlyAdmin {
        require(newBatchSize <= maxBatchSize, "Batch size too high");
        batchSize = newBatchSize;
    }

    /**
     @notice Updates the minimum amount that a user needs to deposit for a particular token
     @param token Address of the ERC20 token
     @param amount New minimum amount for deposits
    */
    function setTokenLimit(address token, uint256 amount) external onlyAdmin {
        tokenLimits[token] = amount;
    }

    function getTokenLimit(address token) external view returns (uint256) {
        return tokenLimits[token];
    }

    /**
      @notice Entrypoint for the user in the bridge. Will create a new deposit
      @param tokenAddress Address of the contract for the ERC20 token that will be deposited
      @param amount number of tokens that need to be deposited
      @param recipientAddress address of the receiver of tokens on Elrond Network
      @notice emits {ERC20Deposited} event
\   */
    function deposit(
        address tokenAddress,
        uint256 amount,
        bytes32 recipientAddress
    ) public {
        require(whitelistedTokens[tokenAddress], "Unsupported token");
        require(amount >= tokenLimits[tokenAddress], "Tried to deposit an amount below the specified limit");

        uint256 currentTimestamp = block.timestamp;

        Batch storage batch;
        if (_shouldCreateNewBatch()) {
            batch = batches[batchesCount];
            batch.nonce = batchesCount + 1;
            batch.timestamp = currentTimestamp;
            batchesCount++;
        } else {
            batch = batches[batchesCount - 1];
        }

        uint256 depositNonce = depositsCount + 1;
        batch.deposits.push(
            Deposit(depositNonce, tokenAddress, amount, msg.sender, recipientAddress, DepositStatus.Pending)
        );

        batch.lastUpdatedTimestamp = currentTimestamp;
        depositsCount++;

        tokenBalances[tokenAddress] += amount;

        IERC20 erc20 = IERC20(tokenAddress);
        erc20.safeTransferFrom(msg.sender, address(this), amount);

        emit ERC20Deposit(depositNonce, batch.nonce);
    }

    /**
     @notice Endpoint used by the bridge to perform transfers coming from another chain
    */
    function transfer(
        address tokenAddress,
        uint256 amount,
        address recipientAddress
    ) external onlyBridge returns (bool) {
        IERC20 erc20 = IERC20(tokenAddress);
        bool transferExecuted = erc20.boolTransfer(recipientAddress, amount);
        if (transferExecuted) {
            tokenBalances[tokenAddress] -= amount;
        }

        return transferExecuted;
    }

    /**
     @notice Endpoint used by the admin to recover tokens sent directly to the contract
     @param tokenAddress Address of the ERC20 contract
    */
    function recoverLostFunds(address tokenAddress) external onlyAdmin {
        IERC20 erc20 = IERC20(tokenAddress);
        uint256 mainBalance = erc20.balanceOf(address(this));
        uint256 availableForRecovery;
        if (whitelistedTokens[tokenAddress]) {
            availableForRecovery = mainBalance - tokenBalances[tokenAddress];
        } else {
            availableForRecovery = mainBalance;
        }

        erc20.safeTransfer(msg.sender, availableForRecovery);
    }

    /**
        @notice Gets information about a batch of deposits
        @param batchNonce Identifier for the batch
        @return Batch which consists of:
        - batch nonce
        - timestamp
        - deposits List of the deposits included in this batch
    */
    function getBatch(uint256 batchNonce) public view returns (Batch memory) {
        Batch memory batch = batches[batchNonce - 1];
        if (_isBatchFinal(batch)) {
            return batch;
        }

        return Batch(0, 0, 0, new Deposit[](0));
    }

    function _isBatchFinal(Batch memory batch) private view returns (bool) {
        return (batch.lastUpdatedTimestamp + batchSettleLimit) < block.timestamp;
    }

    function _isBatchProgessOver(Batch memory batch) private view returns (bool) {
        return (batch.timestamp + batchTimeLimit) < block.timestamp;
    }

    function _shouldCreateNewBatch() private view returns (bool) {
        return
            batchesCount == 0 ||
            _isBatchProgessOver(batches[batchesCount - 1]) ||
            batches[batchesCount - 1].deposits.length >= batchSize;
    }
}
