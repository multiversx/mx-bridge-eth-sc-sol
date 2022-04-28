const { waffle, ethers, network } = require("hardhat");
const { expect } = require("chai");
const { provider, deployContract } = waffle;
const { smockit } = require("@eth-optimism/smock");

const BridgeContract = require("../artifacts/contracts/Bridge.sol/Bridge.json");
const ERC20SafeContract = require("../artifacts/contracts/ERC20Safe.sol/ERC20Safe.json");
const GenericERC20 = require("../artifacts/contracts/GenericERC20.sol/GenericERC20.json");

describe("Bridge", async function () {
  const [adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet] =
    provider.getWallets();
  const boardMembers = [adminWallet, relayer1, relayer2, relayer3, relayer5, relayer6, relayer7, relayer8].map(
    m => m.address,
  );
  const quorum = 7;

  let erc20Safe, bridge, genericErc20;

  async function setupContracts() {
    erc20Safe = await deployContract(adminWallet, ERC20SafeContract);
    bridge = await deployContract(adminWallet, BridgeContract, [boardMembers, quorum, erc20Safe.address]);
    await erc20Safe.setBridge(bridge.address);
    await bridge.unpause();
    await setupErc20Token();
  }

  async function setupErc20Token() {
    genericErc20 = await deployContract(adminWallet, GenericERC20, ["TSC", "TSC"]);
    await genericErc20.mint(adminWallet.address, 1000);
    await genericErc20.approve(erc20Safe.address, 1000);
    await erc20Safe.whitelistToken(genericErc20.address, 0);
    await erc20Safe.unpause();
  }

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
        deployContract(adminWallet, BridgeContract, [boardMembers, invalidQuorumValue, erc20Safe.address]),
      ).to.be.revertedWith("Quorum is too low.");
    });
  });

  describe("addRelayer", async function () {
    it("reverts when called with an empty address", async function () {
      await expect(bridge.addRelayer(ethers.constants.AddressZero)).to.be.revertedWith(
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
      await erc20Safe.deposit(
        genericErc20.address,
        200,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      amount = 200;
      batchNonce = 42;
      signatures = await getSignaturesForExecuteTransfer(
        [genericErc20.address],
        [otherWallet.address],
        [amount],
        [1],
        batchNonce,
      );
    });

    function getExecuteTransferData(tokenAddresses, recipientAddresses, amounts, depositNonces, batchNonce) {
      const signMessageDefinition = ["address[]", "address[]", "uint256[]", "uint256[]", "uint256", "string"];
      const signMessageData = [
        recipientAddresses,
        tokenAddresses,
        amounts,
        depositNonces,
        batchNonce,
        "ExecuteBatchedTransfer",
      ];

      const bytesToSign = ethers.utils.defaultAbiCoder.encode(signMessageDefinition, signMessageData);
      const signData = ethers.utils.keccak256(bytesToSign);
      return ethers.utils.arrayify(signData);
    }

    async function getSignaturesForExecuteTransfer(
      tokenAddresses,
      recipientAddresses,
      amounts,
      depositNonces,
      batchNonce,
    ) {
      dataToSign = getExecuteTransferData(tokenAddresses, recipientAddresses, amounts, depositNonces, batchNonce);
      signature1 = await adminWallet.signMessage(dataToSign);
      signature2 = await relayer1.signMessage(dataToSign);
      signature3 = await relayer2.signMessage(dataToSign);
      signature4 = await relayer3.signMessage(dataToSign);
      signature5 = await relayer5.signMessage(dataToSign);
      signature6 = await relayer6.signMessage(dataToSign);
      signature7 = await relayer7.signMessage(dataToSign);

      return [signature1, signature2, signature3, signature4, signature5, signature6, signature7];
    }

    describe("when quorum achieved", async function () {
      it("transfers tokens", async function () {
        await expect(() =>
          bridge.executeTransfer([genericErc20.address], [otherWallet.address], [amount], [1], batchNonce, signatures),
        ).to.changeTokenBalance(genericErc20, otherWallet, amount);
      });

      it("sets the wasBatchExecuted to true", async function () {
        await bridge.executeTransfer(
          [genericErc20.address],
          [otherWallet.address],
          [amount],
          [1],
          batchNonce,
          signatures,
        );
        expect(await bridge.wasBatchExecuted(batchNonce)).to.be.true;
      });

      describe("but all signatures are from the same relayer", async function () {
        beforeEach(async function () {
          dataToSign = await getExecuteTransferData(
            [genericErc20.address],
            [otherWallet.address],
            [amount],
            [1],
            batchNonce,
          );
          signature1 = await adminWallet.signMessage(dataToSign);
          signatures = [signature1, signature1, signature1, signature1, signature1, signature1, signature1];
        });

        it("reverts", async function () {
          await expect(
            bridge.executeTransfer(
              [genericErc20.address],
              [otherWallet.address],
              [amount],
              [1],
              batchNonce,
              signatures,
            ),
          ).to.be.revertedWith("Quorum was not met");
        });
      });

      describe("but some signatures are from the same relayer", async function () {
        beforeEach(async function () {
          dataToSign = await getExecuteTransferData(
            [genericErc20.address],
            [otherWallet.address],
            [amount],
            [1],
            batchNonce,
          );
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
          await expect(
            bridge.executeTransfer(
              [genericErc20.address],
              [otherWallet.address],
              [amount],
              [1],
              batchNonce,
              signaturesInvalid,
            ),
          ).to.be.revertedWith("Quorum was not met");
          await expect(
            bridge.executeTransfer(
              [genericErc20.address],
              [otherWallet.address],
              [amount],
              [1],
              batchNonce,
              signaturesInvalid2,
            ),
          ).to.be.revertedWith("Quorum was not met");
        });

        it("does not revert", async function () {
          await expect(() =>
            bridge.executeTransfer(
              [genericErc20.address],
              [otherWallet.address],
              [amount],
              [1],
              batchNonce,
              signaturesValid,
            ),
          ).to.changeTokenBalance(genericErc20, otherWallet, amount);
        });
      });
    });

    describe("not enough signatures for quorum", async function () {
      it("reverts", async function () {
        await expect(
          bridge.executeTransfer(
            [genericErc20.address],
            [otherWallet.address],
            [amount],
            [1],
            batchNonce,
            signatures.slice(0, -2),
          ),
        ).to.be.revertedWith("Not enough signatures to achieve quorum");
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
          200,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );

        await bridge.executeTransfer(
          [genericErc20.address],
          [otherWallet.address],
          [amount],
          [1],
          batchNonce,
          signatures,
        );
      });

      it("reverts", async function () {
        await expect(
          bridge.executeTransfer([genericErc20.address], [otherWallet.address], [amount], [1], batchNonce, signatures),
        ).to.be.revertedWith("Batch already executed");
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
        await expect(
          bridge.executeTransfer(
            [genericErc20.address],
            [otherWallet.address],
            [amount],
            [1],
            batchNonce,
            signatures.slice(0, -2),
          ),
        ).to.be.revertedWith("Pausable: paused");
      });

      it("does not set wasBatchExecuted", async function () {
        expect(await bridge.wasBatchExecuted(batchNonce)).to.be.false;
      });
    });

    describe("check execute transfer saves correct statuses", async function () {
      const newSafeFactory = await ethers.getContractFactory("ERC20Safe");
      const newSafe = await newSafeFactory.deploy();
      const mockedSafe = await smockit(newSafe);
      await mockedSafe.unpause();

      const newBridgeFactory = await ethers.getContractFactory("Bridge");
      const newBridge = await newBridgeFactory.deploy(boardMembers, quorum, mockedSafe.address);
      mockedSafe.smocked.transfer.will.return.with(true);

      await newBridge.unpause();

      it("returns correct statuses", async function () {
        //TODO: implement this test
        await newBridge.executeTransfer(
          [genericErc20.address],
          [otherWallet.address],
          [amount],
          [1],
          batchNonce,
          signatures,
        );
        const settleBlockCount = await newBridge.batchSettleBlockCount();
        for (let i = 0; i < settleBlockCount - 1; i++) {
          await network.provider.send("evm_mine");
        }

        await expect(newBridge.getStatusesAfterExecution(batchNonce)).to.be.revertedWith("Statuses not final yet");

        await network.provider.send("evm_mine");

        expect(await newBridge.getStatusesAfterExecution(batchNonce)).to.eql([3]);
      });

      it("saves refund items", async function () {
        await newBridge.executeTransfer(
          [genericErc20.address],
          [otherWallet.address],
          [amount],
          [1],
          batchNonce,
          signatures,
        );
        const settleBlockCount = await newBridge.batchSettleBlockCount();
        for (let i = 0; i < settleBlockCount - 1; i++) {
          await network.provider.send("evm_mine");
        }

        await expect(newBridge.getStatusesAfterExecution(batchNonce)).to.be.revertedWith("Statuses not final yet");

        await network.provider.send("evm_mine");

        expect(await newBridge.getStatusesAfterExecution(batchNonce)).to.eql([3]);
      });
    });

    describe("called by a non relayer", async function () {
      it("reverts", async function () {
        const nonAdminBridge = bridge.connect(otherWallet);
        await expect(
          nonAdminBridge.executeTransfer(
            [genericErc20.address],
            [otherWallet.address],
            [amount],
            [1],
            batchNonce,
            signatures,
          ),
        ).to.be.revertedWith("Access Control: sender is not Relayer");
      });
    });
  });
});
