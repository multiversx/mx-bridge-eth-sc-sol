const { waffle, ethers, network } = require("hardhat");
const { expect } = require("chai");
const { provider, deployContract } = waffle;
const { smockit } = require("@eth-optimism/smock");

const BridgeContract = require("../artifacts/contracts/Bridge.sol/Bridge.json");
const ERC20SafeContract = require("../artifacts/contracts/ERC20Safe.sol/ERC20Safe.json");
const AFC = require("../artifacts/contracts/AFCoin.sol/AFCoin.json");

describe("Bridge", async function () {
  const [adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet] =
    provider.getWallets();
  const boardMembers = [adminWallet, relayer1, relayer2, relayer3, relayer5, relayer6, relayer7, relayer8].map(
    m => m.address,
  );
  const quorum = 7;
  const batchSize = 10;

  async function setupContracts() {
    erc20Safe = await deployContract(adminWallet, ERC20SafeContract);
    bridge = await deployContract(adminWallet, BridgeContract, [boardMembers, quorum, erc20Safe.address]);
    await erc20Safe.setBridge(bridge.address);
    await setupErc20Token();
  }

  async function setupErc20Token() {
    afc = await deployContract(adminWallet, AFC, [1000]);
    await afc.approve(erc20Safe.address, 1000);
    await erc20Safe.whitelistToken(afc.address, 0);
  }

  async function setupFullBatch() {
    for (i = 0; i < batchSize; i++) {
      await erc20Safe.deposit(
        afc.address,
        2,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
    }
  }

  async function settleCurrentBatch() {
    // leave enough time until settleBlockCount number of blocks have been mined (probability for a reorg is minimal)
    settleBlockCount = await erc20Safe.batchSettleBlockCount.call();
    for (i = 0; i < settleBlockCount; i++) {
      await network.provider.send("evm_mine");
    }
  }

  async function setupReadyBatch() {
    await erc20Safe.deposit(
      afc.address,
      2,
      Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
    );

    // 10 minutes and one second into the future
    timeElapsedSinceBatchCreation = 10 * 60 + 1;
    await network.provider.send("evm_increaseTime", [timeElapsedSinceBatchCreation]);
    await network.provider.send("evm_mine");
  }

  beforeEach(async function () {
    await setupContracts();
  });

  it("Sets creator as admin", async function () {
    expect(await bridge.admin()).to.equal(adminWallet.address);
  });

  it("Sets the quorum", async function () {
    expect(await bridge.quorum()).to.equal(quorum);
  });

  it("Sets the board members with relayer rights", async function () {
    expect(await bridge.getRelayers()).to.eql(boardMembers);
  });

  describe("when initialized with a quorum that is lower than the minimum", async function () {
    it("reverts", async function () {
      invalidQuorumValue = 1;
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

  describe("getNextPendingBatch", async function () {
    describe("when batch is ready", async function () {
      describe("by being full", async function () {
        beforeEach(async function () {
          await setupFullBatch();
          await settleCurrentBatch();
        });

        it("returns the batch", async function () {
          batch = await bridge.getNextPendingBatch();
          expect(batch.nonce).to.equal(1);
        });

        it("returns all the deposits", async function () {
          batch = await bridge.getNextPendingBatch();
          expect(batch.deposits.length).to.equal(10);
        });
      });

      describe("by being old", async function () {
        beforeEach(async function () {
          await setupReadyBatch();
          await settleCurrentBatch();
        });

        it("returns the batch", async function () {
          batch = await bridge.getNextPendingBatch();
          expect(batch.nonce).to.equal(1);
        });

        it("returns all the deposits", async function () {
          batch = await bridge.getNextPendingBatch();
          expect(batch.deposits.length).to.equal(1);
        });
      });
    });

    describe("when batch is not ready", async function () {
      describe("because it is not full", async function () {
        beforeEach(async function () {
          await erc20Safe.deposit(
            afc.address,
            2,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          );
        });

        it("returns an empty batch", async function () {
          batch = await bridge.getNextPendingBatch();
          expect(batch.nonce).to.equal(0);
        });
      });

      describe("because not enough time has passed since the batch was created", async function () {
        beforeEach(async function () {
          await erc20Safe.deposit(
            afc.address,
            2,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          );

          // 10 minutes into the future
          timeElapsedSinceBatchCreation = 10 * 60 - 1;
          await network.provider.send("evm_increaseTime", [timeElapsedSinceBatchCreation]);
          await network.provider.send("evm_mine");
        });

        it("returns an empty batch", async function () {
          batch = await bridge.getNextPendingBatch();
          expect(batch.nonce).to.equal(0);
        });
      });

      describe("because not enough time has passed since the last transaction in batch", async function () {
        beforeEach(async function () {
          await setupFullBatch();
        });

        it("returns an empty batch", async function () {
          batch = await bridge.getNextPendingBatch();
          expect(batch.nonce).to.equal(0);
        });
      });
    });
  });

  describe("finishCurrentPendingBatch", async function () {
    async function getBatchDataToSign(batch, newStatuses) {
      signMessageDefinition = ["uint256", "uint8[]", "string"];
      signMessageData = [batch.nonce, newStatuses, "CurrentPendingBatch"];
      bytesToSign = ethers.utils.defaultAbiCoder.encode(signMessageDefinition, signMessageData);
      signData = ethers.utils.keccak256(bytesToSign);

      return ethers.utils.arrayify(signData);
    }

    async function getBatchSignaturesForQuorum(batch, newStatuses) {
      dataToSign = await getBatchDataToSign(batch, newStatuses);
      signature1 = await adminWallet.signMessage(dataToSign);
      signature2 = await relayer1.signMessage(dataToSign);
      signature3 = await relayer2.signMessage(dataToSign);
      signature4 = await relayer3.signMessage(dataToSign);
      signature5 = await relayer5.signMessage(dataToSign);
      signature6 = await relayer6.signMessage(dataToSign);
      signature7 = await relayer7.signMessage(dataToSign);

      return [signature1, signature2, signature3, signature4, signature5, signature6, signature7];
    }

    beforeEach(async function () {
      await setupFullBatch();
      await settleCurrentBatch();
    });

    describe("when quorum achieved", async function () {
      describe("all deposits executed successfully", async function () {
        beforeEach(async function () {
          newDepositStatuses = [3, 3, 3, 3, 3, 3, 4, 4, 4, 4];
          batch = await bridge.getNextPendingBatch();
          signatures = await getBatchSignaturesForQuorum(batch, newDepositStatuses);
        });

        it("updates the deposits", async function () {
          const batchBefore = await erc20Safe.getBatch(batch.nonce);
          const finishTx = await bridge.finishCurrentPendingBatch(batch.nonce, newDepositStatuses, signatures);
          const batchAfter = await erc20Safe.getBatch(batch.nonce);
          // console.log("--------------------", batchAfter);
          // console.log("with tx - checking gas", finishTx);
          // Test refund items and current pending batch nonce;
        });

        it("accepts geth signatures", async function () {
          gethSignatures = signatures.map(s => s.slice(0, s.length - 2) + (s.slice(-2) == "1b" ? "00" : "01"));
          // Test refund items and current pending batch nonce;
        });

        it("moves to the next batch", async function () {
          await bridge.finishCurrentPendingBatch(batch.nonce, newDepositStatuses, signatures);
          let refunds = await erc20Safe.connect(adminWallet).claimRefund(afc.address);
          expect(refunds.length).to.not.equal(0);

          nextBatch = await bridge.getNextPendingBatch();
          expect(nextBatch.nonce).to.not.equal(batch.nonce);
        });
      });

      describe("but all signatures are from the same relayer", async function () {
        beforeEach(async function () {
          newDepositStatuses = [3, 3, 3, 3, 3, 3, 4, 4, 4, 4];
          batch = await bridge.getNextPendingBatch();

          dataToSign = await getBatchDataToSign(batch, newDepositStatuses);
          signature1 = await adminWallet.signMessage(dataToSign);
          signatures = [signature1, signature1, signature1, signature1, signature1, signature1, signature1];
        });

        it("reverts", async function () {
          await expect(
            bridge.finishCurrentPendingBatch(batch.nonce, newDepositStatuses, signatures),
          ).to.be.revertedWith("Quorum was not met");
        });
      });
    });

    describe("with incorrect number of statuses", async function () {
      beforeEach(async function () {
        newDepositStatuses = [3, 3];
        batch = await bridge.getNextPendingBatch();
      });
      it("reverts", async function () {
        await expect(
          bridge.finishCurrentPendingBatch(
            batch.nonce,
            newDepositStatuses,
            await getBatchSignaturesForQuorum(batch, newDepositStatuses),
          ),
        ).to.be.revertedWith("Number of deposit statuses must match the number of deposits in the batch");
      });
    });

    describe("with non final states", async function () {
      beforeEach(async function () {
        newDepositStatuses = [1, 3, 3, 3, 3, 3, 3, 3, 3, 3];
        batch = await bridge.getNextPendingBatch();
      });
      it("reverts", async function () {
        await expect(
          bridge.finishCurrentPendingBatch(
            batch.nonce,
            newDepositStatuses,
            await getBatchSignaturesForQuorum(batch, newDepositStatuses),
          ),
        ).to.be.revertedWith("Non-final state. Can only be Executed or Rejected");
      });
    });

    describe("with not enough signatures", async function () {
      beforeEach(async function () {
        newDepositStatuses = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
        batch = await bridge.getNextPendingBatch();
      });
      it("reverts", async function () {
        signature1 = await adminWallet.signMessage("dataToSign");
        await expect(
          bridge.finishCurrentPendingBatch(batch.nonce, newDepositStatuses, [signature1]),
        ).to.be.revertedWith("Not enough signatures to achieve quorum");
      });
    });

    describe("called by a non relayer", async function () {
      beforeEach(async function () {
        newDepositStatuses = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
        batch = await bridge.getNextPendingBatch();
        signatures = await getBatchSignaturesForQuorum(batch, newDepositStatuses);
      });

      it("reverts", async function () {
        nonAdminBridge = bridge.connect(otherWallet);
        await expect(
          nonAdminBridge.finishCurrentPendingBatch(batch.nonce, newDepositStatuses, signatures),
        ).to.be.revertedWith("Access Control: sender is not Relayer");
      });
    });
  });

  describe("executeTransfer", async function () {
    beforeEach(async function () {
      await erc20Safe.deposit(
        afc.address,
        200,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      amount = 200;
      batchNonce = 42;
      signatures = await getSignaturesForExecuteTransfer([afc.address], [otherWallet.address], [amount], batchNonce);
    });

    function getExecuteTransferData(tokenAddresses, recipientAddresses, amounts, batchNonce) {
      signMessageDefinition = ["address[]", "address[]", "uint256[]", "uint256", "string"];
      signMessageData = [recipientAddresses, tokenAddresses, amounts, batchNonce, "ExecuteBatchedTransfer"];

      bytesToSign = ethers.utils.defaultAbiCoder.encode(signMessageDefinition, signMessageData);
      signData = ethers.utils.keccak256(bytesToSign);
      return ethers.utils.arrayify(signData);
    }

    async function getSignaturesForExecuteTransfer(tokenAddresses, recipientAddresses, amounts, batchNonce) {
      dataToSign = getExecuteTransferData(tokenAddresses, recipientAddresses, amounts, batchNonce);
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
          bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures),
        ).to.changeTokenBalance(afc, otherWallet, amount);
      });

      it("sets the wasBatchExecuted to true", async function () {
        await bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures);
        expect(await bridge.wasBatchExecuted(batchNonce)).to.be.true;
      });

      describe("but all signatures are from the same relayer", async function () {
        beforeEach(async function () {
          dataToSign = await getExecuteTransferData([afc.address], [otherWallet.address], [amount], batchNonce);
          signature1 = await adminWallet.signMessage(dataToSign);
          signatures = [signature1, signature1, signature1, signature1, signature1, signature1, signature1];
        });

        it("reverts", async function () {
          await expect(
            bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures),
          ).to.be.revertedWith("Quorum was not met");
        });
      });

      describe("but some signatures are from the same relayer", async function () {
        beforeEach(async function () {
          dataToSign = await getExecuteTransferData([afc.address], [otherWallet.address], [amount], batchNonce);
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
            bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signaturesInvalid),
          ).to.be.revertedWith("Quorum was not met");
          await expect(
            bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signaturesInvalid2),
          ).to.be.revertedWith("Quorum was not met");
        });

        it("does not revert", async function () {
          await expect(() =>
            bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signaturesValid),
          ).to.changeTokenBalance(afc, otherWallet, amount);
        });
      });
    });

    describe("not enough signatures for quorum", async function () {
      it("reverts", async function () {
        await expect(
          bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures.slice(0, -2)),
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
          afc.address,
          200,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );

        await bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures);
      });

      it("reverts", async function () {
        await expect(
          bridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures),
        ).to.be.revertedWith("Batch already executed");
      });
    });

    describe("check execute transfer saves correct statuses", async function () {
      it("returns correct statuses", async function () {
        const newSafeFactory = await ethers.getContractFactory("ERC20Safe");
        const newSafe = await newSafeFactory.deploy();
        const mockedSafe = await smockit(newSafe);

        const newBridgeFactory = await ethers.getContractFactory("Bridge");
        const newBridge = await newBridgeFactory.deploy(boardMembers, quorum, mockedSafe.address);
        mockedSafe.smocked.transfer.will.return.with(true);

        await newBridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures);
        const settleBlockCount = await newBridge.batchSettleBlockCount();
        for (let i = 0; i < settleBlockCount - 1; i++) {
          await network.provider.send("evm_mine");
        }

        await expect(newBridge.getStatusesAfterExecution(batchNonce)).to.be.revertedWith("Statuses not final yet");

        await network.provider.send("evm_mine");

        expect(await newBridge.getStatusesAfterExecution(batchNonce)).to.eql([3]);
      });

      it("saves refund items", async function () {
        const newSafeFactory = await ethers.getContractFactory("ERC20Safe");
        const newSafe = await newSafeFactory.deploy();
        const mockedSafe = await smockit(newSafe);

        const newBridgeFactory = await ethers.getContractFactory("Bridge");
        const newBridge = await newBridgeFactory.deploy(boardMembers, quorum, mockedSafe.address);
        mockedSafe.smocked.transfer.will.return.with(true);

        await newBridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures);
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
        nonAdminBridge = bridge.connect(otherWallet);
        await expect(
          nonAdminBridge.executeTransfer([afc.address], [otherWallet.address], [amount], batchNonce, signatures),
        ).to.be.revertedWith("Access Control: sender is not Relayer");
      });
    });
  });
});
