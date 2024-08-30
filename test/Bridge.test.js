const { ethers } = require("hardhat");
const { expect } = require("chai");

const { deployContract, deployUpgradableContract } = require("./utils/deploy.utils");
const { getSignaturesForExecuteTransfer, getExecuteTransferData } = require("./utils/bridge.utils");

describe("Bridge", async function () {
  let adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet;
  let boardMembers;
  const quorum = 7;
  let erc20Safe, bridge, genericErc20, bridgeProxy;

  async function setupContracts() {
    erc20Safe = await deployUpgradableContract(adminWallet, "ERC20Safe");
    bridgeProxy = await deployUpgradableContract(adminWallet, "BridgeProxy");
    bridge = await deployUpgradableContract(adminWallet, "Bridge", [
      boardMembers,
      quorum,
      erc20Safe.address,
      bridgeProxy.address,
    ]);
    await erc20Safe.setBridge(bridge.address);
    await bridgeProxy.setBridge(bridge.address);
    await bridge.unpause();
    await setupErc20Token();
  }
  async function setupErc20Token() {
    genericErc20 = await deployContract(adminWallet, "GenericERC20", ["TSC", "TSC", 6]);
    await genericErc20.mint(adminWallet.address, 1000);
    await genericErc20.approve(erc20Safe.address, 1000);
    await erc20Safe.whitelistToken(genericErc20.address, 0, 100, false, true);
    await erc20Safe.unpause();
  }

  before(async function () {
    [adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet] =
      await ethers.getSigners();
    boardMembers = [adminWallet, relayer1, relayer2, relayer3, relayer5, relayer6, relayer7, relayer8].map(
      m => m.address,
    );
  });

  beforeEach(async function () {
    await setupContracts();
  });
  it("sets creator as admin", async function () {
    expect(await bridge.admin()).to.equal(adminWallet.address);
  });
  it("sets the quorum", async function () {
    expect(await bridge.quorum()).to.equal(quorum);
  });
  it("Sets the board members with relayer rights", async function () {
    expect(await bridge.getRelayers()).to.eql(boardMembers);
  });
  describe("when initialized with a quorum that is lower than the minimum", async function () {
    it("reverts", async function () {
      const invalidQuorumValue = 1;
      await expect(
        deployUpgradableContract(adminWallet, "Bridge", [
          boardMembers,
          invalidQuorumValue,
          erc20Safe.address,
          bridgeProxy.address,
        ]),
      ).to.be.revertedWith("Quorum is too low.");
    });
  });
  describe("addRelayer", async function () {
    it("reverts when called with an empty address", async function () {
      await expect(bridge.addRelayer(ethers.ZeroAddress)).to.be.revertedWith(
        "RelayerRole: account cannot be the 0 address",
      );
    });
    it("reverts when not called by admin", async function () {
      nonAdminBridge = bridge.connect(otherWallet);
      await expect(nonAdminBridge.addRelayer(relayer4.address)).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
    });
    it("adds the address as a relayer", async function () {
      await bridge.addRelayer(relayer4.address);
      expect(await bridge.isRelayer(relayer4.address)).to.be.true;
    });
    it("emits event that a relayer was added", async function () {
      await expect(bridge.addRelayer(relayer4.address))
        .to.emit(bridge, "RelayerAdded")
        .withArgs(relayer4.address, adminWallet.address);
    });
    it("reverts if new relayer is already a relayer", async function () {
      await bridge.addRelayer(relayer4.address);
      await expect(bridge.addRelayer(relayer4.address)).to.be.revertedWith("RelayerRole: address is already a relayer");
    });
  });
  describe("removeRelayer", async function () {
    beforeEach(async function () {
      await bridge.addRelayer(relayer4.address);
    });
    it("removes the relayer", async function () {
      await bridge.removeRelayer(relayer4.address);
      expect(await bridge.isRelayer(relayer4.address)).to.be.false;
    });
    it("emits an event", async function () {
      expect(await bridge.isRelayer(relayer4.address)).to.be.true;
      await expect(bridge.removeRelayer(relayer4.address))
        .to.emit(bridge, "RelayerRemoved")
        .withArgs(relayer4.address, adminWallet.address);
    });
    it("reverts when not called by admin", async function () {
      nonAdminBridge = bridge.connect(otherWallet);
      await expect(nonAdminBridge.removeRelayer(relayer4.address)).to.be.revertedWith(
        "Access Control: sender is not Admin",
      );
    });
    it("reverts if address is not already a relayer", async function () {
      await expect(bridge.removeRelayer(otherWallet.address)).to.be.revertedWith(
        "RelayerRole: address is not a relayer",
      );
    });
  });
  describe("setQuorum", async function () {
    const newQuorum = 8;
    it("sets the quorum with the new value", async function () {
      await bridge.setQuorum(newQuorum);
      expect(await bridge.quorum()).to.equal(newQuorum);
    });
    it("emits event", async function () {
      await expect(bridge.setQuorum(newQuorum)).to.emit(bridge, "QuorumChanged").withArgs(newQuorum);
    });
    it("reverts when not called by admin", async function () {
      nonAdminBridge = bridge.connect(otherWallet);
      await expect(nonAdminBridge.setQuorum(newQuorum)).to.be.revertedWith("Access Control: sender is not Admin");
    });
    describe("when quorum is lower than the minimum", async function () {
      it("reverts", async function () {
        await expect(bridge.setQuorum(2)).to.be.revertedWith("Quorum is too low.");
      });
    });
  });
  describe("executeTransfer", async function () {
    let amount, batchNonce, signatures;
    let mvxTxn;
    let dataToSign,
      signature1,
      signature2,
      signature3,
      signature4,
      signature5,
      signature6,
      signature7,
      signaturesInvalid,
      signaturesInvalid2,
      signaturesValid;
    beforeEach(async function () {
      amount = 80;
      await erc20Safe.deposit(
        genericErc20.address,
        amount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      batchNonce = 42;
      mvxTxn = {
        token: genericErc20.address,
        sender: Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        recipient: otherWallet.address,
        amount: amount,
        depositNonce: 1,
        callData: "0x",
      };
      signatures = await getSignaturesForExecuteTransfer([mvxTxn], batchNonce, [
        adminWallet,
        relayer1,
        relayer2,
        relayer3,
        relayer5,
        relayer6,
        relayer7,
        relayer8,
      ]);
    });
    describe("when quorum achieved", async function () {
      it("transfers tokens", async function () {
        await expect(() => bridge.executeTransfer([mvxTxn], batchNonce, signatures)).to.changeTokenBalance(
          genericErc20,
          otherWallet,
          amount,
        );
      });
      it("sets the wasBatchExecuted to true", async function () {
        await bridge.executeTransfer([mvxTxn], batchNonce, signatures);
        expect(await bridge.wasBatchExecuted(batchNonce)).to.be.true;
      });
      describe("but all signatures are from the same relayer", async function () {
        beforeEach(async function () {
          dataToSign = await getExecuteTransferData([mvxTxn], batchNonce);
          signature1 = await adminWallet.signMessage(dataToSign);
          signatures = [signature1, signature1, signature1, signature1, signature1, signature1, signature1];
        });
        it("reverts", async function () {
          await expect(bridge.executeTransfer([mvxTxn], batchNonce, signatures)).to.be.revertedWith(
            "Quorum was not met",
          );
        });
      });
      describe("but some signatures are from the same relayer", async function () {
        beforeEach(async function () {
          dataToSign = await getExecuteTransferData([mvxTxn], batchNonce);
          signature1 = await adminWallet.signMessage(dataToSign);
          signature2 = await relayer1.signMessage(dataToSign);
          signature3 = await relayer2.signMessage(dataToSign);
          signature4 = await relayer3.signMessage(dataToSign);
          signature5 = await relayer5.signMessage(dataToSign);
          signature6 = await relayer6.signMessage(dataToSign);
          signature7 = await relayer7.signMessage(dataToSign);
          signaturesInvalid = [signature1, signature1, signature1, signature1, signature1, signature1, signature1];
          signaturesInvalid2 = [signature1, signature1, signature2, signature3, signature4, signature5, signature6];
          signaturesValid = [signature1, signature2, signature3, signature4, signature5, signature6, signature7];
        });
        it("reverts", async function () {
          await expect(bridge.executeTransfer([mvxTxn], batchNonce, signaturesInvalid)).to.be.revertedWith(
            "Quorum was not met",
          );
          await expect(bridge.executeTransfer([mvxTxn], batchNonce, signaturesInvalid2)).to.be.revertedWith(
            "Quorum was not met",
          );
        });
        it("does not revert", async function () {
          await expect(() => bridge.executeTransfer([mvxTxn], batchNonce, signaturesValid)).to.changeTokenBalance(
            genericErc20,
            otherWallet,
            amount,
          );
        });
      });
    });
    describe("not enough signatures for quorum", async function () {
      it("reverts", async function () {
        await expect(bridge.executeTransfer([mvxTxn], batchNonce, signatures.slice(0, -2))).to.be.revertedWith(
          "Not enough signatures to achieve quorum",
        );
      });
      it("does not set wasBatchExecuted", async function () {
        expect(await bridge.wasBatchExecuted(batchNonce)).to.be.false;
      });
    });
    describe("trying to replay the batch", async function () {
      beforeEach(async function () {
        // add more funds in order to not fail because of insufficient balance
        await erc20Safe.deposit(
          genericErc20.address,
          amount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );
        await bridge.executeTransfer([mvxTxn], batchNonce, signatures);
      });
      it("reverts", async function () {
        await expect(bridge.executeTransfer([mvxTxn], batchNonce, signatures)).to.be.revertedWith(
          "Batch already executed",
        );
      });
    });

    describe("contract is paused", async function () {
      beforeEach(async function () {
        await bridge.pause();
      });
      afterEach(async function () {
        await bridge.unpause();
      });
      it("fails", async function () {
        await expect(bridge.executeTransfer([mvxTxn], batchNonce, signatures.slice(0, -2))).to.be.revertedWith(
          "Pausable: paused",
        );
      });
      it("does not set wasBatchExecuted", async function () {
        expect(await bridge.wasBatchExecuted(batchNonce)).to.be.false;
      });
    });
    describe("check execute transfer saves correct statuses", async function () {
      it("returns correct statuses", async function () {
        //TODO: implement this test
        await bridge.executeTransfer([mvxTxn], batchNonce, signatures);
        const settleBlockCount = await bridge.batchSettleBlockCount();
        for (let i = 0; i < settleBlockCount - 1n; i++) {
          await network.provider.send("evm_mine");
        }
        const [firstStatuses, firstIsFinal] = await bridge.getStatusesAfterExecution(batchNonce);
        expect(firstStatuses).to.eql([3n]);
        expect(firstIsFinal).to.be.false;

        await network.provider.send("evm_mine");
        const [secondStatuses, secondIsFinal] = await bridge.getStatusesAfterExecution(batchNonce);
        expect(secondStatuses).to.eql([3n]);
        expect(secondIsFinal).to.be.true;
      });
      it("saves refund items", async function () {
        await bridge.executeTransfer([mvxTxn], batchNonce, signatures);
        const settleBlockCount = await bridge.batchSettleBlockCount();
        for (let i = 0; i < settleBlockCount - 1n; i++) {
          await network.provider.send("evm_mine");
        }
        const [firstStatuses, firstIsFinal] = await bridge.getStatusesAfterExecution(batchNonce);
        expect(firstStatuses).to.eql([3n]);
        expect(firstIsFinal).to.be.false;

        await network.provider.send("evm_mine");
        const [secondStatuses, secondIsFinal] = await bridge.getStatusesAfterExecution(batchNonce);
        expect(secondStatuses).to.eql([3n]);
        expect(secondIsFinal).to.be.true;
      });
    });
    describe("called by a non relayer", async function () {
      it("reverts", async function () {
        const nonAdminBridge = bridge.connect(otherWallet);
        await expect(nonAdminBridge.executeTransfer([mvxTxn], batchNonce, signatures)).to.be.revertedWith(
          "Access Control: sender is not Relayer",
        );
      });
    });
  });
});
