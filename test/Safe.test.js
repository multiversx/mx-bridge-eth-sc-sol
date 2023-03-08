const { expect } = require("chai");
const { waffle, ethers, network } = require("hardhat");
const { provider, deployContract } = waffle;

const GenericERC20Artifact = require("../artifacts/contracts/GenericERC20.sol/GenericERC20.json");
const ERC20SafeArtifact = require("../artifacts/contracts/ERC20Safe.sol/ERC20Safe.json");
const BridgeArtifact = require("../artifacts/contracts/Bridge.sol/Bridge.json");
const BridgeMockArtifact = require("../artifacts/contracts/test/BridgeMock.sol/BridgeMock.json");

describe("ERC20Safe", async function () {
  const defaultMinAmount = 25;
  const defaultMaxAmount = 100;
  const [adminWallet, otherWallet, simpleBoardMember] = provider.getWallets();
  const boardMembers = [adminWallet, otherWallet, simpleBoardMember];

  let safe, genericERC20, bridge;
  beforeEach(async function () {
    genericERC20 = await deployContract(adminWallet, GenericERC20Artifact, ["TSC", "TSC"]);
    safe = await deployContract(adminWallet, ERC20SafeArtifact);
    bridge = await deployContract(adminWallet, BridgeArtifact, [boardMembers.map(m => m.address), 3, safe.address]);

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
      await safe.whitelistToken(genericERC20.address, "25", "100");
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
      await expect(safe.connect(otherWallet).whitelistToken(genericERC20.address, "0", "100")).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
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
      await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      await genericERC20.mint(adminWallet.address, "1000000");
      await safe.unpause();
      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );

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
        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
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
      await expect(
        safe.deposit(
          genericERC20.address,
          100,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        ),
      ).to.be.revertedWith("Unsupported token");
    });

    describe("contract is paused", async function () {
      beforeEach(async function () {
        await safe.pause();
      });
      afterEach(async function () {
        await safe.unpause();
      });
      it("fails", async function () {
        await expect(
          safe.deposit(
            genericERC20.address,
            defaultMinAmount,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          ),
        ).to.be.revertedWith("Pausable: paused");
      });
    });

    describe("when token is whitelisted", async function () {
      beforeEach(async function () {
        await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount);
        await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        await genericERC20.mint(adminWallet.address, "1000000");
      });

      it("reverts when amount is smaller than minimum specified limit", async function () {
        await expect(
          safe.deposit(
            genericERC20.address,
            defaultMinAmount - 1,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          ),
        ).to.be.revertedWith("Tried to deposit an amount below the minimum specified limit");
      });

      it("reverts when amount is bigger than maximum specified limit", async function () {
        await expect(
          safe.deposit(
            genericERC20.address,
            defaultMaxAmount + 1,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          ),
        ).to.be.revertedWith("Tried to deposit an amount above the maximum specified limit");
      });

      it("increments depositsCount", async () => {
        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );

        expect(await safe.depositsCount()).to.equal(1);
      });

      it("updates the lastUpdatedBlockNumber on the batch", async function () {
        await safe.setBatchBlockLimit(1);
        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        const batchNonce = await safe.batchesCount();
        const batchAfterFirstTx = await safe.getBatch(batchNonce);

        // Manually increase block time, it doesn't happen by default
        await network.provider.send("evm_increaseTime", [3600]);
        for (let i = 0; i < 41; i++) {
          await network.provider.send("evm_mine");
        }

        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        await network.provider.send("evm_mine");
        const batchAfterSecondTx = await safe.getBatch(batchNonce);

        expect(batchAfterFirstTx.lastUpdatedBlockNumber).to.not.equal(batchAfterSecondTx.lastUpdatedBlockNumber);
      });

      it("creates new batches by batchSize", async function () {
        await safe.setBatchSize(2);
        expect(await safe.batchesCount()).to.be.eq(0);

        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        expect(await safe.batchesCount()).to.be.eq(1);
        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        expect(await safe.batchesCount()).to.be.eq(1);

        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
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

        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        expect(await safe.batchesCount()).to.be.eq(1);

        await network.provider.send("evm_increaseTime", [batchBlockLimit + 1]);
        for (let i = 0; i < batchBlockLimit + 1; i++) {
          await network.provider.send("evm_mine");
        }

        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );

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
          let depositResp = await safe.deposit(
            genericERC20.address,
            defaultMinAmount,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          );

          expect(depositResp.gasLimit).to.be.lt(400000);
        }
      });
    });
  });

  describe("ERC20Safe - recovering of funds works as expected", async function () {
    beforeEach(async function () {
      await genericERC20.mint(adminWallet.address, "1000000");
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
      await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );

      await genericERC20.transfer(safe.address, "1");
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999999949");

      await safe.recoverLostFunds(genericERC20.address);
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999999950");

      expect(await genericERC20.balanceOf(safe.address)).to.be.eq("50");
    });

    it("sends just the balance above what is actually deposited for whitelited tokens - considers bridge transfers", async function () {
      await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

      const mockBridge = await deployContract(adminWallet, BridgeMockArtifact, [
        boardMembers.map(m => m.address),
        3,
        safe.address,
      ]);
      await safe.setBridge(mockBridge.address);

      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );

      await mockBridge.proxyTransfer(genericERC20.address, defaultMinAmount, adminWallet.address);

      await genericERC20.transfer(safe.address, "1");
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999999974");

      await safe.recoverLostFunds(genericERC20.address);
      expect(await genericERC20.balanceOf(adminWallet.address)).to.be.eq("999999999975");

      expect(await genericERC20.balanceOf(safe.address)).to.be.eq("25");
    });
  });

  describe("ERC20Safe - getBatch works as expected", async function () {
    beforeEach(async function () {
      await safe.whitelistToken(genericERC20.address, defaultMinAmount, defaultMaxAmount);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      await genericERC20.mint(adminWallet.address, "1000000");
    });

    it("returns batch only after final", async function () {
      await safe.setBatchSize(3);
      const batchBlockLimit = parseInt((await safe.batchBlockLimit()).toString());

      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      // Just after deposit
      expect((await safe.getBatch(1)).depositsCount).to.be.eq(0);

      await network.provider.send("evm_increaseTime", [batchBlockLimit - 1]);
      for (let i = 0; i < batchBlockLimit - 1; i++) {
        await network.provider.send("evm_mine");
      }

      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );

      await network.provider.send("evm_increaseTime", [batchBlockLimit - 1]);
      for (let i = 0; i < batchBlockLimit - 1; i++) {
        await network.provider.send("evm_mine");
      }

      // Enough time has passed since the creation of the batch but not since last deposit
      expect((await safe.getBatch(1)).depositsCount).to.be.eq(0);
      await network.provider.send("evm_increaseTime", [2]);
      for (let i = 0; i < 2; i++) {
        await network.provider.send("evm_mine");
      }
      expect((await safe.getBatch(1)).depositsCount).to.be.eq(2);
    });
  });
});
