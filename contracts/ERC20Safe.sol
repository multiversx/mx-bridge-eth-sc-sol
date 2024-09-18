//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SharedStructs.sol";
import "./access/BridgeRole.sol";
import "./lib/Pausable.sol";
import "./lib/BoolTokenTransfer.sol";

interface IMintableERC20 is IERC20 {
    function mint(address to, uint256 amount) external;
}

interface IBurnableERC20 is IERC20 {
    function burnFrom(address account, uint256 amount) external;
}

/**
@title ERC20 Safe for bridging tokens
@author MultiversX
@notice Contract to be used by the users to make deposits that will be bridged
In order to use it:
- The Bridge.sol must be deployed and must be whitelisted for the Safe contract.
@dev The deposits are requested by the Bridge, and in order to save gas spent by the relayers
they will be batched either by time (batchTimeLimit) or size (batchSize).
 */
contract ERC20Safe is Initializable, BridgeRole, Pausable {
    using SafeERC20 for IERC20;
    using BoolTokenTransfer for IERC20;

    uint64 public batchesCount;
    uint64 public depositsCount;
    uint16 public batchSize;
    uint16 private constant maxBatchSize = 100;
    uint8 public batchBlockLimit;
    uint8 public batchSettleLimit;
    uint256 public numBuckets;
    uint256 public blocksInBucket;
    uint256 public defaultSingleTransactionThreshold;
    uint256 public defaultAggregateValueThreshold;

    // Reserved storage slots for future upgrades
    uint256[10] private __gap;

    mapping(uint256 => uint256) public bucketLastUpdatedNonce;
    mapping(uint256 => mapping(address => uint256)) public aggregatedValue;
    mapping(uint256 => Batch) public batches;
    mapping(address => bool) public whitelistedTokens;
    mapping(address => bool) public mintBurnTokens;
    mapping(address => bool) public nativeTokens;
    mapping(address => uint256) public tokenMinLimits;
    mapping(address => uint256) public tokenMaxLimits;
    mapping(address => uint256) public totalBalances;
    mapping(address => uint256) public mintBalances;
    mapping(address => uint256) public burnBalances;
    mapping(uint256 => Deposit[]) public batchDeposits;
    mapping(address => uint256) public singleTransactionThreshold;
    mapping(address => uint256) public aggregateValueThreshold;

    event ERC20Deposit(uint112 batchId, uint112 depositNonce);
    event ERC20SCDeposit(uint112 indexed batchId, uint112 depositNonce, bytes callData);
    event TransactionDelayed(
        address indexed sender,
        address indexed tokenAddress,
        uint256 amount,
        bytes32 recipientAddress,
        bool isLarge
    );

    //optional
    event DelayedTransactionProcessed(
        address indexed sender,
        address indexed tokenAddress,
        uint256 amount,
        bytes32 recipientAddress,
        bool isLarge
    );

    DelayedTransaction[] public delayedTransactions;

    function initialize() public initializer {
        __BridgeRole_init();
        __Pausable_init();
        __ERC20Safe__init_unchained();
    }

    function __ERC20Safe__init_unchained() internal onlyInitializing {
        batchSize = 10;
        batchBlockLimit = 40;
        batchSettleLimit = 40;
        numBuckets = 24;
        blocksInBucket = 300; // 300 blocks = 3600 seconds/12 seconds per block
        defaultSingleTransactionThreshold = 1000; //to be set correctly
        defaultAggregateValueThreshold = 10000; //to be set correctly
    }

    /**
      @notice Whitelist a token. Only whitelisted tokens can be bridged.
      @param token Address of the ERC20 token that will be whitelisted
      @param minimumAmount Number that specifies the minimum number of tokens that the user has to deposit - to also cover for fees
      @param maximumAmount Number that specifies the maximum number of tokens that the user has to deposit
      @notice emits {TokenWhitelisted} event
   */
    function whitelistToken(
        address token,
        uint256 minimumAmount,
        uint256 maximumAmount,
        bool mintBurn,
        bool native,
        uint256 totalBalance,
        uint256 mintBalance,
        uint256 burnBalance,
        uint256 singleTxThreshold,
        uint256 aggregateThreshold
    ) external onlyAdmin {
        if (!mintBurn) {
            require(native, "Only native tokens can be stored!");
        }
        whitelistedTokens[token] = true;
        mintBurnTokens[token] = mintBurn;
        nativeTokens[token] = native;
        tokenMinLimits[token] = minimumAmount;
        tokenMaxLimits[token] = maximumAmount;
        if (mintBurn) {
            require(totalBalance == 0, "Mint-burn tokens must have 0 total balance!");
            initSupplyMintBurn(token, mintBalance, burnBalance);
        } else {
            require(mintBalance == 0, "Stored tokens must have 0 mint balance!");
            require(burnBalance == 0, "Stored tokens must have 0 burn balance!");
            initSupply(token, totalBalance);
        }

        if (singleTxThreshold == 0) {
            singleTransactionThreshold[token] = defaultSingleTransactionThreshold;
        } else {
            singleTransactionThreshold[token] = singleTxThreshold;
        }

        if (aggregateThreshold == 0) {
            aggregateValueThreshold[token] = defaultAggregateValueThreshold;
        } else {
            aggregateValueThreshold[token] = aggregateThreshold;
        }
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
     @notice Updates the block number limit used to check if a batch is finalized for processing
     @param newBatchBlockLimit New block number limit that will be set until a batch is considered final
    */
    function setBatchBlockLimit(uint8 newBatchBlockLimit) external onlyAdmin {
        require(newBatchBlockLimit <= batchSettleLimit, "Cannot increase batch block limit over settlement limit");
        batchBlockLimit = newBatchBlockLimit;
    }

    /**
     @notice Updates the settle number limit used to determine if a batch is final
     @param newBatchSettleLimit New block settle limit that will be set until a batch is considered final
    */
    function setBatchSettleLimit(uint8 newBatchSettleLimit) external onlyAdmin whenPaused {
        require(!isAnyBatchInProgress(), "Cannot change batchSettleLimit with pending batches");
        require(
            newBatchSettleLimit >= batchBlockLimit,
            "Cannot decrease batchSettleLimit under the value of batch block limit"
        );
        batchSettleLimit = newBatchSettleLimit;
    }

    /**
     @notice Updates the maximum number of deposits accepted in a batch
     @param newBatchSize New number of deposits until the batch is considered full
    */
    function setBatchSize(uint16 newBatchSize) external onlyAdmin {
        require(newBatchSize <= maxBatchSize, "Batch size too high");
        batchSize = newBatchSize;
    }

    /**
     @notice Updates the minimum amount that a user needs to deposit for a particular token
     @param token Address of the ERC20 token
     @param amount New minimum amount for deposits
    */
    function setTokenMinLimit(address token, uint256 amount) external onlyAdmin {
        tokenMinLimits[token] = amount;
    }

    function getTokenMinLimit(address token) external view returns (uint256) {
        return tokenMinLimits[token];
    }

    /**
     @notice Updates the maximum amount that a user needs to deposit for a particular token
     @param token Address of the ERC20 token
     @param amount New maximum amount for deposits
    */
    function setTokenMaxLimit(address token, uint256 amount) external onlyAdmin {
        tokenMaxLimits[token] = amount;
    }

    function getTokenMaxLimit(address token) external view returns (uint256) {
        return tokenMaxLimits[token];
    }

    /**
      @notice Entrypoint for the user in the bridge. Will create a new deposit
      @param tokenAddress Address of the contract for the ERC20 token that will be deposited
      @param amount number of tokens that need to be deposited
      @param recipientAddress address of the receiver of tokens on MultiversX Network
      @notice emits {ERC20Deposited} event
\   */
    function deposit(address tokenAddress, uint256 amount, bytes32 recipientAddress) public whenNotPaused {
        uint112 batchNonce;
        uint112 depositNonce;
        (batchNonce, depositNonce) = _deposit_common(tokenAddress, amount, recipientAddress);
        // emit ERC20Deposit(depositNonce, batchNonce); //i would remove it
    }

    /*
     * @notice Entrypoint for the user in the bridge. Will create a new deposit
     * @dev The `callData` parameter is structured to include the endpoint name, gas limit, and arguments for the cross-chain call.
     *
     * @param tokenAddress The address of the ERC20 token to deposit.
     * @param amount The amount of tokens to deposit.
     * @param recipientAddress The address on the target chain to receive the tokens.
     * @param callData The encoded data specifying the cross-chain call details. The expected format is:
     *        0x + endpoint_name_length (4 bytes) + endpoint_name + gas_limit (8 bytes) +
     *        01 (ArgumentsPresentProtocolMarker) + num_arguments_length (4 bytes) + [argument_length (4 bytes) + argument]...
     *        This payload includes the endpoint name, gas limit for the execution, and the arguments for the call.
     *        In case of no arguments, only the ArgumentsMissingProtocolMarker should be included. The expected format is:
     *        0x + endpoint_name_length (4 bytes) + endpoint_name + gas_limit (8 bytes) +
     *        00 (ArgumentsPresentProtocolMarker)
     */
    function depositWithSCExecution(
        address tokenAddress,
        uint256 amount,
        bytes32 recipientAddress,
        bytes calldata callData
    ) public whenNotPaused {
        uint112 batchNonce;
        uint112 depositNonce;
        (batchNonce, depositNonce) = _deposit_common(tokenAddress, amount, recipientAddress);
        emit ERC20SCDeposit(batchNonce, depositNonce, callData);
    }

    function _deposit_common(
        address tokenAddress,
        uint256 amount,
        bytes32 recipientAddress
    ) internal returns (uint112 batchNonce, uint112 depositNonce) {
        require(whitelistedTokens[tokenAddress], "Unsupported token");
        require(amount >= tokenMinLimits[tokenAddress], "Tried to deposit an amount below the minimum specified limit");
        require(amount <= tokenMaxLimits[tokenAddress], "Tried to deposit an amount above the maximum specified limit");

        _processDelayedTransactions(tokenAddress);

        bool isLargeTransaction = amount >= singleTransactionThreshold[tokenAddress];
        uint256 currentBlock = block.number;
        uint256 bucketId = (currentBlock / blocksInBucket) % numBuckets;

        _resetBucketIfNeeded(bucketId, tokenAddress, currentBlock);

        if (isLargeTransaction) {
            _addDelayedTransaction(tokenAddress, amount, recipientAddress, true);
            emit TransactionDelayed(msg.sender, tokenAddress, amount, recipientAddress, true);
            return (0, 0);
        } else {
            uint256 totalAggregatedValue = _getTotalAggregatedValue(tokenAddress, currentBlock);
            if (totalAggregatedValue + amount <= aggregateValueThreshold[tokenAddress]) {
                aggregatedValue[bucketId][tokenAddress] += amount;
                (batchNonce, depositNonce) = _processDeposit(tokenAddress, amount, recipientAddress);
                return (batchNonce, depositNonce);
            } else {
                _addDelayedTransaction(tokenAddress, amount, recipientAddress, false);
                emit TransactionDelayed(msg.sender, tokenAddress, amount, recipientAddress, false);
                return (0, 0);
            }
        }
    }

    function _resetBucketIfNeeded(uint256 bucketId, address tokenAddress, uint256 currentBlock) internal {
        if (currentBlock - bucketLastUpdatedNonce[bucketId] > blocksInBucket) {
            aggregatedValue[bucketId][tokenAddress] = 0;
            bucketLastUpdatedNonce[bucketId] = currentBlock;
        }
    }

    function _addDelayedTransaction(
        address tokenAddress,
        uint256 amount,
        bytes32 recipientAddress,
        bool isLarge
    ) internal {
        DelayedTransaction memory dt = DelayedTransaction({
            amount: amount,
            tokenAddress: tokenAddress,
            sender: msg.sender,
            recipientAddress: recipientAddress,
            blockAdded: block.number,
            isLarge: isLarge
        });
        delayedTransactions.push(dt);
    }

    function _processDelayedTransactions(address tokenAddress) internal {
        uint256 i = 0;
        while (i < delayedTransactions.length) {
            DelayedTransaction storage dt = delayedTransactions[i];

            if (dt.tokenAddress != tokenAddress) {
                i++;
                continue;
            }

            if (_canProcessDelayedTransaction(dt)) {
                _processDeposit(dt.tokenAddress, dt.amount, dt.recipientAddress);

                delayedTransactions[i] = delayedTransactions[delayedTransactions.length - 1];
                delayedTransactions.pop();

                emit DelayedTransactionProcessed(
                    dt.sender,
                    dt.tokenAddress,
                    dt.amount,
                    dt.recipientAddress,
                    dt.isLarge
                );
            } else {
                i++;
            }
        }
    }

    function _canProcessDelayedTransaction(DelayedTransaction storage dt) internal returns (bool) {
        uint256 currentBlock = block.number;
        uint256 averageBlockTime = 12;

        if (dt.isLarge) {
            uint256 blocksIn24Hours = (24 * 60 * 60) / averageBlockTime;
            return currentBlock >= dt.blockAdded + blocksIn24Hours;
        } else {
            uint256 bucketId = (currentBlock / blocksInBucket) % numBuckets;

            _resetBucketIfNeeded(bucketId, dt.tokenAddress, currentBlock);

            uint256 totalAggregatedValue = _getTotalAggregatedValue(dt.tokenAddress, currentBlock);
            uint256 threshold = aggregateValueThreshold[dt.tokenAddress];

            if (totalAggregatedValue + dt.amount <= threshold) {
                aggregatedValue[bucketId][dt.tokenAddress] += dt.amount;
                return true;
            } else if (currentBlock >= dt.blockAdded + ((24 * 60 * 60) / averageBlockTime)) {
                return true;
            } else {
                return false;
            }
        }
    }

    function _processDeposit(
        address tokenAddress,
        uint256 amount,
        bytes32 recipientAddress
    ) internal returns (uint112 batchNonce, uint112 depositNonce) {
        uint64 currentBlockNumber = uint64(block.number);

        Batch storage batch;
        if (_shouldCreateNewBatch()) {
            batch = batches[batchesCount];
            batch.nonce = batchesCount + 1;
            batch.blockNumber = currentBlockNumber;
            batchesCount++;
        } else {
            batch = batches[batchesCount - 1];
        }

        depositNonce = depositsCount + 1;
        batchDeposits[batchesCount - 1].push(
            Deposit(depositNonce, tokenAddress, amount, msg.sender, recipientAddress, DepositStatus.Pending)
        );

        batch.lastUpdatedBlockNumber = currentBlockNumber;
        batch.depositsCount++;
        depositsCount++;

        if (!_isTokenMintBurn(tokenAddress)) {
            totalBalances[tokenAddress] += amount;
            IERC20 erc20 = IERC20(tokenAddress);
            erc20.safeTransferFrom(msg.sender, address(this), amount);
        } else {
            if (!nativeTokens[tokenAddress]) {
                require(mintBalances[tokenAddress] >= burnBalances[tokenAddress] + amount, "Not enough minted tokens");
            }
            burnBalances[tokenAddress] += amount;
            IBurnableERC20 erc20 = IBurnableERC20(tokenAddress);
            erc20.burnFrom(msg.sender, amount);
        }

        batchNonce = batch.nonce;
        emit ERC20Deposit(batchNonce, depositNonce);
        return (batchNonce, depositNonce);
    }

    function _getTotalAggregatedValue(
        address tokenAddress,
        uint256 currentBlock
    ) internal returns (uint256 totalAggregatedValue) {
        totalAggregatedValue = 0;

        for (uint256 i = 0; i < numBuckets; i++) {
            if (currentBlock - bucketLastUpdatedNonce[i] >= blocksInBucket) {
                aggregatedValue[i][tokenAddress] = 0;
                bucketLastUpdatedNonce[i] = currentBlock;
            }
            totalAggregatedValue += aggregatedValue[i][tokenAddress];
        }
    }

    function getThreshold(address tokenAddress) public view returns (uint256) {
        return aggregateValueThreshold[tokenAddress];
    }

    function setThreshold(address token, uint256 amount) external onlyAdmin {
        aggregateValueThreshold[token] = amount;
    }

    function getSingleTxThreshold(address tokenAddress) public view returns (uint256) {
        return singleTransactionThreshold[tokenAddress];
    }

    function setSingleTxThreshold(address token, uint256 amount) external onlyAdmin {
        singleTransactionThreshold[token] = amount;
    }

    function processDelayedTransactionImmediately(uint256 index) external onlyAdmin {
        require(index < delayedTransactions.length, "Invalid index");
        DelayedTransaction storage dt = delayedTransactions[index];

        _processDeposit(dt.tokenAddress, dt.amount, dt.recipientAddress);

        delayedTransactions[index] = delayedTransactions[delayedTransactions.length - 1];
        delayedTransactions.pop();

        emit DelayedTransactionProcessed(dt.sender, dt.tokenAddress, dt.amount, dt.recipientAddress, dt.isLarge);
    }

    /**
      @notice Deposit initial supply for an ESDT token already deployed on MultiversX
      @param tokenAddress Address of the contract for the ERC20 token that will be deposited
      @param amount number of tokens that need to be deposited
    */
    function initSupply(address tokenAddress, uint256 amount) public onlyAdmin {
        require(whitelistedTokens[tokenAddress], "Unsupported token");
        require(!_isTokenMintBurn(tokenAddress), "Cannot init for mintable/burnable tokens");
        require(nativeTokens[tokenAddress], "Only native tokens can be stored!");

        totalBalances[tokenAddress] += amount;
        IERC20 erc20 = IERC20(tokenAddress);
        erc20.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
      @notice Set burn and mint balances for a mintable/burnable token
      @param tokenAddress Address of the contract for the ERC20 token that will be deposited
      @param burnAmount number of tokens that are already burned
      @param mintAmount number of tokens that are already minted
    */
    function initSupplyMintBurn(address tokenAddress, uint256 mintAmount, uint256 burnAmount) public onlyAdmin {
        require(whitelistedTokens[tokenAddress], "Unsupported token");
        require(_isTokenMintBurn(tokenAddress), "Cannot init for non mintable/burnable tokens");

        burnBalances[tokenAddress] = burnAmount;
        mintBalances[tokenAddress] = mintAmount;
    }

    /**
     @notice Endpoint used by the bridge to perform transfers coming from another chain
    */
    function transfer(
        address tokenAddress,
        uint256 amount,
        address recipientAddress
    ) external onlyBridge returns (bool) {
        if (!_isTokenMintBurn(tokenAddress)) {
            IERC20 erc20 = IERC20(tokenAddress);
            bool transferExecuted = erc20.boolTransfer(recipientAddress, amount);
            if (!transferExecuted) {
                return false;
            }
            totalBalances[tokenAddress] -= amount;
            return true;
        }
        if (nativeTokens[tokenAddress]) {
            require(burnBalances[tokenAddress] >= mintBalances[tokenAddress] + amount, "Not enough burned tokens");
        }
        bool mintExecuted = _internalMint(tokenAddress, recipientAddress, amount);
        if (!mintExecuted) {
            return false;
        }
        mintBalances[tokenAddress] += amount;

        return true;
    }

    /**
     @notice Endpoint used by the admin to reset the token balance to the current balance
     @notice This endpoint is used only for migration from v2 to v3 and will be removed in the next version
     @param tokenAddress Address of the ERC20 contract
    */
    function resetTotalBalance(address tokenAddress) external onlyAdmin {
        require(whitelistedTokens[tokenAddress], "Unsupported token");
        require(!_isTokenMintBurn(tokenAddress), "Token is mintable/burnable");

        IERC20 erc20 = IERC20(tokenAddress);
        uint256 mainBalance = erc20.balanceOf(address(this));
        totalBalances[tokenAddress] = mainBalance;
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
            availableForRecovery = mainBalance - totalBalances[tokenAddress];
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
        - lastUpdatedTimestamp
        - depositsCount
    */
    function getBatch(uint256 batchNonce) public view returns (Batch memory, bool isBatchFinal) {
        Batch memory batch = batches[batchNonce - 1];
        return (batch, _isBatchFinal(batch));
    }

    /**
     @notice Gets a list of deposits for a batch nonce
     @param batchNonce Identifier for the batchsetBatchSettleLimit
     @return a list of deposits included in this batch
    */
    function getDeposits(uint256 batchNonce) public view returns (Deposit[] memory, bool areDepositsFinal) {
        Batch memory batch = batches[batchNonce - 1];
        return (batchDeposits[batchNonce - 1], _isBatchFinal(batch));
    }

    /**
     @notice Checks whether there is any batch still in progress
    */
    function isAnyBatchInProgress() public view returns (bool) {
        if (batchesCount == 0) {
            return false;
        }

        Batch memory lastBatch = batches[batchesCount - 1];
        if (!_shouldCreateNewBatch()) {
            return true;
        }
        if (!_isBatchFinal(lastBatch)) {
            return true;
        }

        return false;
    }

    function _isBatchFinal(Batch memory batch) private view returns (bool) {
        return (batch.lastUpdatedBlockNumber + batchSettleLimit) < block.number;
    }

    function _isBatchProgessOver(uint16 depCount, uint64 blockNumber) private view returns (bool) {
        if (depCount == 0) {
            return false;
        }
        return (blockNumber + batchBlockLimit) < block.number;
    }

    function _shouldCreateNewBatch() private view returns (bool) {
        if (batchesCount == 0) {
            return true;
        }

        Batch memory batch = batches[batchesCount - 1];
        return _isBatchProgessOver(batch.depositsCount, batch.blockNumber) || batch.depositsCount >= batchSize;
    }

    function _internalMint(address token, address to, uint256 amount) internal returns (bool) {
        IMintableERC20 mintableToken = IMintableERC20(token);
        try mintableToken.mint(to, amount) {
            return true;
        } catch {
            return false;
        }
    }

    function _isTokenMintBurn(address token) internal view returns (bool) {
        return mintBurnTokens[token];
    }
}
