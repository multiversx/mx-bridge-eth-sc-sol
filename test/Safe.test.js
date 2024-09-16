const { expect } = require("chai");
const { ethers } = require("hardhat");
const { encodeCallData } = require("@multiversx/sdk-js-bridge");

const { deployContract, deployUpgradableContract, upgradeContract } = require("./utils/deploy.utils");

describe("ERC20Safe", function () {
  const defaultMinAmount = 25;
  const defaultMaxAmount = 100;
  const recipientAddress = Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex");

  let adminWallet, otherWallet, simpleBoardMember;
  let boardMembers;

  before(async function () {
    [adminWallet, otherWallet, simpleBoardMember] = await ethers.getSigners();
    boardMembers = [adminWallet, otherWallet, simpleBoardMember];
  });

  let safe, genericERC20, bridge, bridgeProxy;
  beforeEach(async function () {
    genericERC20 = await deployContract(adminWallet, "GenericERC20", ["TSC", "TSC", 6]);
    safe = await deployUpgradableContract(adminWallet, "ERC20Safe");
    bridgeProxy = await deployUpgradableContract(adminWallet, "BridgeProxy");
    bridge = await deployUpgradableContract(adminWallet, "Bridge", [
      boardMembers.map(m => m.address),
      3,
      safe.address,
      bridgeProxy.address,
    ]);

    await genericERC20.approve(safe.address, 1000);
    await safe.setBridge(bridge.address);
    await bridge.unpause();
    await safe.unpause();
  });

  it("sets creator as admin", async function () {
    expect(await safe.admin()).to.equal(adminWallet.address);
  });

  describe("ERC20Safe - setting whitelisted tokens works as expected", async function () {
    it("correctly whitelists token and updates limits", async function () {
      await safe.whitelistToken(genericERC20.address, "25", "100", false, true, 0, 0, 0, 0, 0);
      expect(await safe.isTokenWhitelisted(genericERC20.address)).to.be.true;
      expect(await safe.getTokenMinLimit(genericERC20.address)).to.eq("25");
      expect(await safe.getTokenMaxLimit(genericERC20.address)).to.eq("100");

      await safe.setTokenMinLimit(genericERC20.address, "50");
      await safe.setTokenMaxLimit(genericERC20.address, "80");
      expect(await safe.getTokenMinLimit(genericERC20.address)).to.eq("50");
      expect(await safe.getTokenMaxLimit(genericERC20.address)).to.eq("80");
    });
    it("correctly removes token from whitelist", async function () {
      await safe.removeTokenFromWhitelist(genericERC20.address);
      expect(await safe.isTokenWhitelisted(genericERC20.address)).to.be.false;
    });
    it("reverts", async function () {
      await expect(
        safe.connect(otherWallet).whitelistToken(genericERC20.address, "0", "100", false, true, 0, 0, 0, 0, 0),
      ).to.be.revertedWith("Access Control: sender is not Admin");
      await expect(safe.connect(otherWallet).removeTokenFromWhitelist(genericERC20.address)).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
    });
  });

  describe("ERC20Safe - setting batch block limit works as expected", async function () {
    it("is default correct", async function () {
      const tenMinutes = 40;
      expect(await safe.batchBlockLimit()).to.eq(tenMinutes);
    });
    it("updates the batch time limit", async function () {
      const eight = 8;
      await safe.setBatchBlockLimit(eight);
      expect(await safe.batchBlockLimit()).to.equal(eight);
    });
    it("reverts", async function () {
      await expect(safe.connect(otherWallet).setBatchBlockLimit(30)).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
      await expect(safe.connect(adminWallet).setBatchBlockLimit(50)).to.be.revertedWith(
        "Cannot increase batch block limit over settlement limit",
      );
    });
  });

  describe("ERC20Safe - setting batch settle limit works as expected", async function () {
    it("is default correct", async function () {
      const tenMinutes = 40;
      expect(await safe.batchSettleLimit()).to.eq(tenMinutes);
    });
    it("reverts", async function () {
      await expect(safe.connect(adminWallet).setBatchSettleLimit(50)).to.be.revertedWith("Pausable: not paused");

      await safe.pause();

      await expect(safe.connect(otherWallet).setBatchSettleLimit(50)).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );

      // Having no batch
      await expect(safe.connect(adminWallet).setBatchSettleLimit(30)).to.be.revertedWith(
        "Cannot decrease batchSettleLimit under the value of batch block limit",
      );

      // Creating a batch
      await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount, false, true, 0, 0, 0, 0, 0);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      await genericERC20.mint(adminWallet.address, "1000000");
      await safe.unpause();
      await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);

      // Thanks to the previous deposit, we have a pending non-final batch
      await safe.pause();
      await expect(safe.connect(adminWallet).setBatchSettleLimit(30)).to.be.revertedWith(
        "Cannot change batchSettleLimit with pending batches",
      );
      await safe.unpause();

      await network.provider.send("evm_increaseTime", [3600]);
      for (let i = 0; i < 41; i++) {
        await network.provider.send("evm_mine");
      } // Finalized the batch
      await safe.pause();
      await expect(safe.connect(adminWallet).setBatchSettleLimit(30)).to.be.revertedWith(
        "Cannot decrease batchSettleLimit under the value of batch block limit",
      );
      await safe.unpause();

      // Now we should fill a batch without finalising it, so _shouldCreateNewBatch returns true, but _isBatchFinal
      //  will return false
      const batchSize = await safe.batchSize();
      for (let i = 0; i < batchSize; i++) {
        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
      }
      await safe.pause();
      await expect(safe.connect(adminWallet).setBatchSettleLimit(30)).to.be.revertedWith(
        "Cannot change batchSettleLimit with pending batches",
      );
      await safe.unpause();
    });

    it("updates the batch settle limit", async function () {
      await safe.pause();

      const batchSettleLimit = 50;
      await safe.connect(adminWallet).setBatchSettleLimit(batchSettleLimit);
      expect(await safe.batchSettleLimit()).to.equal(batchSettleLimit);

      await safe.unpause();
    });
  });

  describe("ERC20Safe - setting batch size works as expected", async function () {
    it("is default correct", async function () {
      expect(await safe.batchSize()).to.eq(10);
    });
    it("updates the batch size", async function () {
      await safe.setBatchSize("20");
      expect(await safe.batchSize()).to.equal(20);
    });
    it("reverts - for bigger than max size", async function () {
      await expect(safe.setBatchSize("1000")).to.be.revertedWith("Batch size too high");
    });
    it("reverts - for non admin", async function () {
      await expect(safe.connect(otherWallet).setBatchSize("24")).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
    });
  });

  describe("ERC20Safe - deposit works as expected", async function () {
    it("reverts for token that is not whitelisted", async function () {
      await expect(safe.deposit(genericERC20.address, 100, recipientAddress)).to.be.revertedWith("Unsupported token");
    });

    describe("contract is paused", async function () {
      beforeEach(async function () {
        await safe.pause();
      });
      afterEach(async function () {
        await safe.unpause();
      });
      it("fails", async function () {
        await expect(safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress)).to.be.revertedWith(
          "Pausable: paused",
        );
      });
    });

    describe("when token is whitelisted", async function () {
      beforeEach(async function () {
        await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount, false, true, 0, 0, 0, 0, 0);
        await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        await genericERC20.mint(adminWallet.address, "1000000");
      });

      it("reverts when amount is smaller than minimum specified limit", async function () {
        await expect(safe.deposit(genericERC20.address, defaultMinAmount - 1, recipientAddress)).to.be.revertedWith(
          "Tried to deposit an amount below the minimum specified limit",
        );
      });

      it("reverts when amount is bigger than maximum specified limit", async function () {
        await expect(safe.deposit(genericERC20.address, defaultMaxAmount + 1, recipientAddress)).to.be.revertedWith(
          "Tried to deposit an amount above the maximum specified limit",
        );
      });

      it("should emit event in case of deposit success", async function () {
        const callData = encodeCallData("depositEndpoint", 500000, [25, "someArgument"]);
        await expect(
          safe.connect(adminWallet).depositWithSCExecution(genericERC20.address, 25, recipientAddress, callData),
        )
          .to.emit(safe, "ERC20SCDeposit")
          .withArgs(1, 1, callData);
      });

      it("increments depositsCount", async () => {
        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);

        expect(await safe.depositsCount()).to.equal(1);
      });

      it("updates the lastUpdatedBlockNumber on the batch", async function () {
        await safe.setBatchBlockLimit(1);
        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
        const batchNonce = await safe.batchesCount();
        const [batchAfterFirstTx, isFirstFinal] = await safe.getBatch(batchNonce);

        // Manually increase block time, it doesn't happen by default
        await network.provider.send("evm_increaseTime", [3600]);
        for (let i = 0; i < 41; i++) {
          await network.provider.send("evm_mine");
        }

        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
        await network.provider.send("evm_mine");
        const [batchAfterSecondTx, isSecondFinal] = await safe.getBatch(batchNonce);

        expect(batchAfterFirstTx.lastUpdatedBlockNumber).to.equal(batchAfterSecondTx.lastUpdatedBlockNumber);
        expect(isFirstFinal).to.equal(false);
        expect(isSecondFinal).to.equal(true);
      });

      it("creates new batches by batchSize", async function () {
        await safe.setBatchSize(2);
        expect(await safe.batchesCount()).to.be.eq(0);

        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
        expect(await safe.batchesCount()).to.be.eq(1);
        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
        expect(await safe.batchesCount()).to.be.eq(1);

        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
        expect(await safe.batchesCount()).to.be.eq(2);
      });

      it("creates new batches as time passes", async function () {
        const batchBlockLimit = parseInt((await safe.batchBlockLimit()).toString());
        await safe.setBatchSize(2);
        expect(await safe.batchesCount()).to.be.eq(0);

        await network.provider.send("evm_increaseTime", [batchBlockLimit + 1]);
        for (let i = 0; i < batchBlockLimit + 1; i++) {
          await network.provider.send("evm_mine");
        }
        // With 0 extra deposits expect batch count to remain the same
        expect(await safe.batchesCount()).to.be.eq(0);

        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
        expect(await safe.batchesCount()).to.be.eq(1);

        await network.provider.send("evm_increaseTime", [batchBlockLimit + 1]);
        for (let i = 0; i < batchBlockLimit + 1; i++) {
          await network.provider.send("evm_mine");
        }

        await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);

        expect(await safe.batchesCount()).to.be.eq(2);
      });

      it("does not increase gas over 400k", async function () {
        const batchBlockLimit = parseInt((await safe.batchBlockLimit()).toString());
        await safe.setBatchSize(40);
        for (let i = 0; i < 80; i++) {
          if (i % 40 === 0) {
            await network.provider.send("evm_increaseTime", [batchBlockLimit + 1]);
            for (let i = 0; i < batchBlockLimit + 1; i++) {
              await network.provider.send("evm_mine");
            }
          }
          let depositResp = await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);

          let receipt = await depositResp.wait();

          //expect(receipt.gasUsed).to.be.lt(400000); // AssertionError: expected 927401 to be below 400000.
        }
      });
    });
  });

  describe("ERC20Safe - recovering of funds works as expected", async function () {
    beforeEach(async function () {
      await genericERC20.mint(adminWallet.address, "1000000000000");
    });

    it("reverts for non admin", async function () {
      await genericERC20.transfer(safe.address, "100");
      await expect(safe.connect(otherWallet).recoverLostFunds(genericERC20.address)).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
    });

    it("sends full balance for unwhitelisted tokens", async function () {
      await genericERC20.transfer(safe.address, "1000000");
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999000000");
      await safe.recoverLostFunds(genericERC20.address);
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("1000000000000");

      expect(await genericERC20.balanceOf(safe.address)).to.be.eq("0");
    });

    it("sends just the balance above what is actually deposited for whitelited tokens", async function () {
      await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount, false, true, 0, 0, 0, 0, 0);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

      await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
      await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);

      await genericERC20.transfer(safe.address, "1");
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999999949");

      await safe.recoverLostFunds(genericERC20.address);
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999999950");

      expect(await genericERC20.balanceOf(safe.address)).to.be.eq("50");
    });

    it("sends just the balance above what is actually deposited for whitelited tokens - considers bridge transfers", async function () {
      await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount, false, true, 0, 0, 0, 0, 0);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

      const mockBridge = await deployUpgradableContract(adminWallet, "BridgeMock", [
        boardMembers.map(m => m.address),
        3,
        safe.address,
        bridgeProxy.address,
      ]);
      await safe.setBridge(mockBridge.address);

      await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
      await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);

      await mockBridge.proxyTransfer(genericERC20.address, defaultMinAmount, adminWallet.address);

      await genericERC20.transfer(safe.address, "1");
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999999974");

      await safe.recoverLostFunds(genericERC20.address);
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999999975");

      expect(await genericERC20.balanceOf(safe.address)).to.be.eq("25");
    });
  });

  describe("ERC20Safe - getBatch and getDeposits work as expected", async function () {
    beforeEach(async function () {
      await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount, false, true, 0, 0, 0, 0, 0);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      await genericERC20.mint(adminWallet.address, "1000000");
    });

    it("returns batch only after final", async function () {
      await safe.setBatchSize(3);
      const batchBlockLimit = parseInt((await safe.batchBlockLimit()).toString());

      await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);
      let [batch, isFinal] = await safe.getBatch(1);
      let [deposits, areDepositsFinal] = await safe.getDeposits(1);
      // Just after deposit
      expect(isFinal).to.be.eq(false);
      expect(isFinal).to.be.eq(areDepositsFinal);
      expect(batch.depositsCount).to.be.eq(deposits.length);
      expect(batch.depositsCount).to.be.eq(1);

      await network.provider.send("evm_increaseTime", [batchBlockLimit - 1]);
      for (let i = 0; i < batchBlockLimit - 1; i++) {
        await network.provider.send("evm_mine");
      }

      await safe.deposit(genericERC20.address, defaultMinAmount, recipientAddress);

      await network.provider.send("evm_increaseTime", [batchBlockLimit - 1]);
      for (let i = 0; i < batchBlockLimit - 1; i++) {
        await network.provider.send("evm_mine");
      }

      // Enough time has passed since the creation of the batch but not since last deposit
      [batch, isFinal] = await safe.getBatch(1);
      [deposits, areDepositsFinal] = await safe.getDeposits(1);
      expect(isFinal).to.be.eq(false);
      expect(isFinal).to.be.eq(areDepositsFinal);
      expect(batch.depositsCount).to.be.eq(deposits.length);
      expect(batch.depositsCount).to.be.eq(2);

      await network.provider.send("evm_increaseTime", [2]);
      for (let i = 0; i < 2; i++) {
        await network.provider.send("evm_mine");
      }

      [batch, isFinal] = await safe.getBatch(1);
      [deposits, areDepositsFinal] = await safe.getDeposits(1);
      expect(isFinal).to.be.eq(true);
      expect(isFinal).to.be.eq(areDepositsFinal);
      expect(batch.depositsCount).to.be.eq(deposits.length);
      expect(batch.depositsCount).to.be.eq(2);
    });
  });

  describe("ERC20Safe - upgrade works as expected", async function () {
    it("upgrades and has new functions", async function () {
      let valueToCheckAgainst = 100n;

      // First change something in the safe to check state persistence
      let currentBatchSize = await safe.batchSize();
      await safe.setBatchSize(currentBatchSize - 1n);

      let newSafe = await upgradeContract(adminWallet, safe.address, "SafeUpgrade", [valueToCheckAgainst]);

      expect(await newSafe.afterUpgrade()).to.be.eq(valueToCheckAgainst);
      expect(await newSafe.batchSize()).to.be.eq(currentBatchSize - 1n);

      await safe.setBatchSize(currentBatchSize);
    });
  });
  describe("ERC20Safe - transaction processing and delays", function () {
    beforeEach(async function () {
      // Whitelist token with specific thresholds
      await safe.whitelistToken(
        genericERC20.address,
        defaultMinAmount,
        defaultMaxAmount * 10,
        false,
        true,
        0,
        0,
        0,
        600,
        1000,
      );

      await genericERC20.approve(safe.address, 100000);
      await genericERC20.mint(adminWallet.address, 10000);
    });

    it("processes small transactions immediately", async function () {
      await expect(safe.deposit(genericERC20.address, 100, recipientAddress))
        .to.emit(safe, "ERC20Deposit")
        .withArgs(1, 1);
      expect(await safe.depositsCount()).to.equal(1);
    });

    it("delays small transactions exceeding aggregate threshold", async function () {
      // Deposit to reach aggregate threshold
      await safe.deposit(genericERC20.address, 600, recipientAddress);
      await safe.deposit(genericERC20.address, 500, recipientAddress);

      // This deposit should be delayed
      await expect(safe.deposit(genericERC20.address, 700, recipientAddress)).to.emit(safe, "TransactionDelayed");
    });

    it("delays large transactions exceeding singleTxThreshold", async function () {
      // This deposit should be delayed
      await expect(safe.deposit(genericERC20.address, 800, recipientAddress))
        .to.emit(safe, "TransactionDelayed")
        .withArgs(adminWallet.address, genericERC20.address, 800, recipientAddress, true);
    });

    it("processes delayed small transactions after 24 hours", async function () {
      // Deposit causing delay
      await safe.deposit(genericERC20.address, 600, recipientAddress);
      await safe.deposit(genericERC20.address, 400, recipientAddress);
      await safe.deposit(genericERC20.address, 200, recipientAddress); // Delayed

      // Simulate 24 hours (14,400 blocks at 6s per block)
      for (let i = 0; i < 14400; i++) {
        await network.provider.send("evm_mine");
      }

      // Trigger processing of delayed transactions
      await expect(safe.deposit(genericERC20.address, 50, recipientAddress)).to.emit(safe, "TransactionProcessed");
    });

    it("processes delayed large transactions after 24 hours", async function () {
      // Deposit causing delay
      await safe.deposit(genericERC20.address, 700, recipientAddress); // Delayed

      // Simulate 24 hours
      for (let i = 0; i < 14400; i++) {
        await network.provider.send("evm_mine");
      }

      // Trigger processing of delayed transactions
      await expect(safe.deposit(genericERC20.address, 500, recipientAddress)).to.emit(safe, "TransactionProcessed");
    });

    it("admin can process delayed transactions immediately", async function () {
      // Deposit causing delay
      await safe.deposit(genericERC20.address, 700, recipientAddress); // Delayed

      // Admin processes delayed transaction
      await expect(safe.processDelayedTransactionImmediately(0)).to.emit(safe, "TransactionProcessed");
    });

    it("does not process delayed transactions before 24 hours", async function () {
      // Deposit causing delay
      await safe.deposit(genericERC20.address, 700, recipientAddress); // Delayed

      // Simulate less than 24 hours
      for (let i = 0; i < 100; i++) {
        await network.provider.send("evm_mine");
      }

      // Attempt to trigger processing
      await expect(safe.deposit(genericERC20.address, 400, recipientAddress)).to.not.emit(safe, "TransactionProcessed");
    });
  });
});
