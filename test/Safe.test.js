const { expect } = require("chai");
const { waffle, ethers, network } = require("hardhat");
const { provider, deployContract } = waffle;

const GenericERC20Artifact = require("../artifacts/contracts/GenericERC20.sol/GenericERC20.json");
const ERC20SafeArtifact = require("../artifacts/contracts/ERC20Safe.sol/ERC20Safe.json");
const BridgeArtifact = require("../artifacts/contracts/Bridge.sol/Bridge.json");
const BridgeMockArtifact = require("../artifacts/contracts/test/BridgeMock.sol/BridgeMock.json");

describe("ERC20Safe", async function () {
  const defaultMinAmount = 25;
  const [adminWallet, otherWallet, simpleBoardMember] = provider.getWallets();
  const boardMembers = [adminWallet, otherWallet, simpleBoardMember];

  let safe, genericERC20, bridge;
  beforeEach(async function () {
    genericERC20 = await deployContract(adminWallet, GenericERC20Artifact, ["TSC", "TSC"]);
    safe = await deployContract(adminWallet, ERC20SafeArtifact);
    bridge = await deployContract(adminWallet, BridgeArtifact, [boardMembers.map(m => m.address), 3, safe.address]);

    await genericERC20.approve(safe.address, 1000);
    await safe.setBridge(bridge.address);
  });

  it("sets creator as admin", async function () {
    expect(await safe.admin()).to.equal(adminWallet.address);
  });

  describe("ERC20Safe - setting whitelisted tokens works as expected", async function () {
    it("correctly whitelists token and updates limits", async function () {
      await safe.whitelistToken(genericERC20.address, "25");
      expect(await safe.isTokenWhitelisted(genericERC20.address)).to.be.true;
      expect(await safe.getTokenLimit(genericERC20.address)).to.eq("25");

      await safe.setTokenLimit(genericERC20.address, "50");
      expect(await safe.getTokenLimit(genericERC20.address)).to.eq("50");
    });
    it("correctly removes token from whitelist", async function () {
      await safe.removeTokenFromWhitelist(genericERC20.address);
      expect(await safe.isTokenWhitelisted(genericERC20.address)).to.be.false;
    });
    it("reverts", async function () {
      await expect(safe.connect(otherWallet).whitelistToken(genericERC20.address, "0")).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
      await expect(safe.connect(otherWallet).removeTokenFromWhitelist(genericERC20.address)).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
    });
  });

  describe("ERC20Safe - setting batch time limit works as expected", async function () {
    it("is default correct", async function () {
      const tenMinutes = 10 * 60;
      expect(await safe.batchTimeLimit()).to.eq(tenMinutes);
    });
    it("updates the batch time limit", async function () {
      const twentyMinutes = 20 * 60;
      await safe.setBatchTimeLimit(twentyMinutes);
      expect(await safe.batchTimeLimit()).to.equal(twentyMinutes);
    });
    it("reverts", async function () {
      await expect(safe.connect(otherWallet).setBatchTimeLimit(10000)).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
    });
  });

  describe("ERC20Safe - setting batch size works as expected", async function () {
    it("is default correct", async function () {
      expect(await safe.batchSize()).to.eq("10");
    });
    it("updates the batch time limit", async function () {
      await safe.setBatchSize("20");
      expect(await safe.batchSize()).to.equal("20");
    });
    it("reverts - for bigger than max size", async function () {
      await expect(safe.setBatchSize("100000")).to.be.revertedWith("Batch size too high");
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

    describe("when token is whitelisted", async function () {
      beforeEach(async function () {
        await safe.whitelistToken(genericERC20.address, defaultMinAmount);
        await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
        await genericERC20.mint(adminWallet.address, "1000000");
      });

      it("reverts when amount is smaller than specified limit", async function () {
        await expect(
          safe.deposit(
            genericERC20.address,
            defaultMinAmount - 1,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          ),
        ).to.be.revertedWith("Tried to deposit an amount below the specified limit");
      });

      it("increments depositsCount", async () => {
        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );

        expect(await safe.depositsCount()).to.equal(1);
      });

      it("updates the lastUpdatedTimestamp on the batch", async function () {
        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        const batchNonce = await safe.batchesCount();
        const batchAfterFirstTx = await safe.getBatch(batchNonce);

        // Manually increase block time, it doesn't happen by default
        await network.provider.send("evm_increaseTime", [3600]);
        await network.provider.send("evm_mine");

        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        const batchAfterSecondTx = await safe.getBatch(batchNonce);

        expect(batchAfterFirstTx.lastUpdatedTimestamp).to.not.equal(batchAfterSecondTx.lastUpdatedTimestamp);
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
        const batchTimeLimit = parseInt((await safe.batchTimeLimit()).toString());
        await safe.setBatchSize(2);
        expect(await safe.batchesCount()).to.be.eq(0);

        await network.provider.send("evm_increaseTime", [batchTimeLimit + 1]);
        await network.provider.send("evm_mine");
        // With 0 extra deposits expect batch count to remain the same
        expect(await safe.batchesCount()).to.be.eq(0);

        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        expect(await safe.batchesCount()).to.be.eq(1);

        await network.provider.send("evm_increaseTime", [batchTimeLimit + 1]);
        await network.provider.send("evm_mine");

        await safe.deposit(
          genericERC20.address,
          defaultMinAmount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        console.log("current deposits", await safe.depositsCount());
        expect(await safe.batchesCount()).to.be.eq(2);
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
      await safe.whitelistToken(genericERC20.address, defaultMinAmount);
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
      await safe.whitelistToken(genericERC20.address, defaultMinAmount);
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
      await safe.whitelistToken(genericERC20.address, defaultMinAmount);
      await genericERC20.approve(safe.address, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      await genericERC20.mint(adminWallet.address, "1000000");
    });

    it("returns batch only after final", async function () {
      await safe.setBatchSize(3);
      const batchTimeLimit = parseInt((await safe.batchTimeLimit()).toString());

      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      // Just after deposit
      expect((await safe.getBatch(1)).deposits.length).to.be.eq(0);

      await network.provider.send("evm_increaseTime", [batchTimeLimit - 1]);
      await network.provider.send("evm_mine");

      await safe.deposit(
        genericERC20.address,
        defaultMinAmount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );

      await network.provider.send("evm_increaseTime", [batchTimeLimit - 1]);
      await network.provider.send("evm_mine");

      // Enough time has passed since the creation of the batch but not since last deposit
      expect((await safe.getBatch(1)).deposits.length).to.be.eq(0);
      await network.provider.send("evm_increaseTime", [2]);
      await network.provider.send("evm_mine");
      expect((await safe.getBatch(1)).deposits.length).to.be.eq(2);
    });
  });
});