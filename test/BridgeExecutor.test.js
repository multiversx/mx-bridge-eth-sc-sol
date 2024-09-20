const { ethers } = require("hardhat");
const { expect } = require("chai");

const { deployContract, deployUpgradableContract, upgradeContract } = require("./utils/deploy.utils");
const { getSignaturesForExecuteTransfer } = require("./utils/bridge.utils");

describe("BridgeExecutor", function () {
  let adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet;
  let boardMembers;
  const quorum = 7;
  let erc20Safe, bridge, bridgeExecutor, genericErc20, testContract;

  async function setupContracts() {
    erc20Safe = await deployUpgradableContract(adminWallet, "ERC20Safe");
    bridgeExecutor = await deployUpgradableContract(adminWallet, "BridgeExecutor");
    bridge = await deployUpgradableContract(adminWallet, "Bridge", [
      boardMembers,
      quorum,
      erc20Safe.address,
      bridgeExecutor.address,
    ]);
    testContract = await deployContract(adminWallet, "BridgeExecutorTestContract", [bridgeExecutor.address]);
    await erc20Safe.setBridge(bridge.address);
    await bridgeExecutor.setBridge(bridge.address);
    await bridge.unpause();
    await bridgeExecutor.unpause();
    await setupErc20Token();
  }

  async function setupErc20Token() {
    genericErc20 = await deployContract(adminWallet, "GenericERC20", ["TSC", "TSC", 6]);
    await genericErc20.mint(adminWallet.address, 2000);
    await genericErc20.approve(erc20Safe.address, 2000);
    await erc20Safe.whitelistToken(genericErc20.address, 0, 10000, false, true, 1000, 0, 0, 0, 0);
    await erc20Safe.unpause();
  }

  const prepareAndExecuteTransfer = async (amountForDeposit, batchNonce, arrayOfTxn) => {
    await erc20Safe.deposit(
      genericErc20.address,
      amountForDeposit,
      Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
    );

    signatures = await getSignaturesForExecuteTransfer(arrayOfTxn, batchNonce, [
      adminWallet,
      relayer1,
      relayer2,
      relayer3,
      relayer5,
      relayer6,
      relayer7,
      relayer8,
    ]);
    await bridge.executeTransfer(arrayOfTxn, batchNonce, signatures);
  };

  function generateCallData(functionSignature, gasLimit, argTypes, argValues) {
    // Compute the function selector
    const functionSelector = ethers.id(functionSignature).slice(0, 10); // First 4 bytes of the hash

    // Encode the function arguments
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const args = coder.encode(argTypes, argValues);

    // Encode the full calldata with function selector, gas limit, and arguments
    const callDataEncoded = coder.encode(["bytes", "uint256", "bytes"], [functionSelector, gasLimit, args]);

    return callDataEncoded;
  }

  const checkForEmptyTransaction = async pendingTxn => {
    expect(pendingTxn[0]).to.equal(ethers.AddressZero);
    expect(pendingTxn[1]).to.equal(ethers.HashZero);
    expect(pendingTxn[2]).to.equal(ethers.AddressZero);
    expect(pendingTxn[3]).to.equal(0);
    expect(pendingTxn[4]).to.equal(0);
    expect(pendingTxn[5]).to.equal("0x");
  };

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
    expect(await bridgeExecutor.admin()).to.equal(adminWallet.address);
  });
  it("sets bridge address", async function () {
    expect(await bridgeExecutor.bridge()).to.equal(bridge.address);
  });

  describe("deposit", function () {
    let amount = 1000;
    let batchNonce = 42;
    let mvxTxn;

    beforeEach(async function () {
      await erc20Safe.deposit(
        genericErc20.address,
        amount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      mvxTxn = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80n,
        depositNonce: 1,
        callData: generateCallData("increment()", 11000000, [], []),
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

    it("reverts when called with an address different than the bridge", async function () {
      await expect(bridgeExecutor.connect(otherWallet).deposit(mvxTxn)).to.be.revertedWith(
        "Access Control: sender is not Bridge",
      );
    });
    it("reverts when contract is paused", async function () {
      await bridgeExecutor.pause();
      await expect(bridge.executeTransfer([mvxTxn], batchNonce, signatures)).to.be.revertedWith("Pausable: paused");
    });
    it("should successfully deposit a pending transactions", async function () {
      await bridge.executeTransfer([mvxTxn], batchNonce, signatures);

      const pendingTxn = await bridgeExecutor.getPendingTransactionById(0);

      expect(pendingTxn[0]).to.equal(mvxTxn.token);
      expect(pendingTxn[1]).to.equal(mvxTxn.sender);
      expect(pendingTxn[2]).to.equal(mvxTxn.recipient);
      expect(pendingTxn[3]).to.equal(mvxTxn.amount);
      expect(pendingTxn[4]).to.equal(mvxTxn.depositNonce);
      expect(pendingTxn[5]).to.equal(mvxTxn.callData);
    });
  });

  describe("execute", function () {
    let amount = 1000;
    let batchNonce = 42;
    let arrayOfTxn = [];

    beforeEach(async function () {
      arrayOfTxn = []; // reset the array
    });

    it("reverts when contract is paused", async function () {
      await bridgeExecutor.pause();
      await expect(bridgeExecutor.execute(0)).to.be.revertedWith("Pausable: paused");
    });
    it("reverts when called with bad transaction id", async function () {
      await expect(bridgeExecutor.execute(arrayOfTxn.length + 1)).to.be.revertedWith(
        "BridgeExecutor: Invalid transaction ID",
      );
    });

    it("should gracefully finish execution and refund if calldata is invalid", async function () {
      const badFunctionSignature = "mint(uint256,uint256)";
      const gasLimit = 11000000;
      const argTypes = ["uint256", "uint256"];
      const argValues = [0, 999];

      const mvxTxnWithInvalidCalldata = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80n,
        depositNonce: 2,
        callData: generateCallData(badFunctionSignature, gasLimit, argTypes, argValues),
      };
      arrayOfTxn.push(mvxTxnWithInvalidCalldata);
      await prepareAndExecuteTransfer(amount, batchNonce, arrayOfTxn);

      const beforeBalance = await genericErc20.balanceOf(bridge.address);
      await bridgeExecutor.execute(0);
      const afterBalance = await genericErc20.balanceOf(bridge.address);

      expect(afterBalance).to.equal(beforeBalance + mvxTxnWithInvalidCalldata.amount);

      // check for pending transaction to be removed after refund
      const pendingTxn = await bridgeExecutor.getPendingTransactionById(0);
      checkForEmptyTransaction(pendingTxn);
    });

    it("should gracefully finish execution and refund if calldata exists but endpoint is empty or gas limit is invalid (zero or below minimum)", async function () {
      const functionSignature = "mint(address,uint256)";
      const argTypes = ["address", "uint256"];
      const argValues = [otherWallet.address, 999];

      const mvxTxnWithZeroGas = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80n,
        depositNonce: 2,
        callData: generateCallData(functionSignature, 0, argTypes, argValues),
      };

      const mvxTxnWithInsufficientGas = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80n,
        depositNonce: 2,
        callData: generateCallData(functionSignature, 2000000, argTypes, argValues),
      };

      const mvxTxnWithEmptyEndpoint = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80n,
        depositNonce: 2,
        callData: generateCallData("", 11000000, argTypes, argValues),
      };

      arrayOfTxn = [mvxTxnWithEmptyEndpoint, mvxTxnWithZeroGas, mvxTxnWithInsufficientGas];
      await prepareAndExecuteTransfer(240, batchNonce, arrayOfTxn);

      await bridgeExecutor.execute(0);
      await bridgeExecutor.execute(1);
      await bridgeExecutor.execute(2);

      // check for pending transaction to be removed after refund
      checkForEmptyTransaction(bridgeExecutor.getPendingTransactionById(0));
      checkForEmptyTransaction(bridgeExecutor.getPendingTransactionById(1));
      checkForEmptyTransaction(bridgeExecutor.getPendingTransactionById(2));
    });

    it("should successfully execute transaction with proper encoded calldata (with args)", async function () {
      const amountToBeMinted = 999n;
      const functionSignature = "mint(address,uint256)";
      const gasLimit = 11000000;
      const argTypes = ["address", "uint256"];
      const argValues = [otherWallet.address, amountToBeMinted];
      mvxTxnWithCalldata = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80n,
        depositNonce: 1,
        callData: generateCallData(functionSignature, gasLimit, argTypes, argValues),
      };
      arrayOfTxn.push(mvxTxnWithCalldata);
      await prepareAndExecuteTransfer(amount, batchNonce, arrayOfTxn);

      // check the otherWallet' balance of the token that have been intended to be minted
      const beforeBalance = await genericErc20.balanceOf(otherWallet.address);
      await bridgeExecutor.execute(0);
      const afterBalance = await genericErc20.balanceOf(otherWallet.address);

      expect(afterBalance).to.equal(beforeBalance + amountToBeMinted);
    });

    it("should successfully execute transaction with proper encoded calldata (without args)", async function () {
      const functionSignature = "increment()";
      const gasLimit = 11000000;
      mvxTxnWithCalldata = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: testContract.address,
        amount: 80n,
        depositNonce: 1,
        callData: generateCallData(functionSignature, gasLimit, [], []),
      };
      arrayOfTxn.push(mvxTxnWithCalldata);
      await prepareAndExecuteTransfer(amount, batchNonce, arrayOfTxn);

      const counterBefore = await testContract.count();
      await bridgeExecutor.execute(0);
      const counterAfter = await testContract.count();

      expect(counterAfter).to.equal(counterBefore + 1n);
    });

    it("should transfer funds from bridge proxy contract after executing transaction", async function () {
      const amount = 80n;
      const functionSignature = "withdraw(address,uint256)";
      const gasLimit = 11000000;
      const argTypes = ["address", "uint256"];
      const argValues = [genericErc20.address, amount];
      mvxTxnWithCalldata = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: testContract.address,
        amount,
        depositNonce: 1,
        callData: generateCallData(functionSignature, gasLimit, argTypes, argValues),
      };
      arrayOfTxn.push(mvxTxnWithCalldata);
      await prepareAndExecuteTransfer(amount, batchNonce, arrayOfTxn);

      const beforeBalanceRecipient = await genericErc20.balanceOf(testContract.address);
      const beforeBalanceBridgeExecutor = await genericErc20.balanceOf(bridgeExecutor.address);

      await bridgeExecutor.execute(0);

      const afterBalanceRecipient = await genericErc20.balanceOf(testContract.address);
      const afterBalanceBridgeExecutor = await genericErc20.balanceOf(bridgeExecutor.address);

      expect(afterBalanceRecipient).to.equal(beforeBalanceRecipient + amount);
      expect(afterBalanceBridgeExecutor).to.equal(beforeBalanceBridgeExecutor - amount);
    });
  });

  describe("getPendingTransactionById", function () {
    let amount = 1000;
    let batchNonce = 42;
    let mvxTxn;

    beforeEach(async function () {
      mvxTxn = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80n,
        depositNonce: 1,
        callData: generateCallData("increment()", 11000000, [], []),
      };
      await prepareAndExecuteTransfer(amount, batchNonce, [mvxTxn]);
    });

    it("should return the transaction with the given id", async function () {
      const pendingTxn = await bridgeExecutor.getPendingTransactionById(0);

      expect(pendingTxn[0]).to.equal(mvxTxn.token);
      expect(pendingTxn[1]).to.equal(mvxTxn.sender);
      expect(pendingTxn[2]).to.equal(mvxTxn.recipient);
      expect(pendingTxn[3]).to.equal(mvxTxn.amount);
      expect(pendingTxn[4]).to.equal(mvxTxn.depositNonce);
      expect(pendingTxn[5]).to.equal(mvxTxn.callData);
    });
  });

  describe("getPendingTransactions", function () {
    let amount = 1000;
    let batchNonce = 42;
    let mvxTxn1, mvxTxn2, mvxTxn3;

    beforeEach(async function () {
      const functionSignature1 = "increment()";
      const gasLimit = 11000000;
      mvxTxn1 = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: testContract.address,
        amount: 80n,
        depositNonce: 1,
        callData: generateCallData(functionSignature1, gasLimit, [], []),
      };

      mvxTxn2 = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80n,
        depositNonce: 2,
        callData: generateCallData("increment()", 11000000, [], []),
      };

      const functionSignature2 = "mint(address,uint256)";
      const argTypes = ["address", "uint256"];
      const argValues = [otherWallet.address, 99];
      mvxTxn3 = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80n,
        depositNonce: 3,
        callData: generateCallData(functionSignature2, gasLimit, argTypes, argValues),
      };

      await prepareAndExecuteTransfer(amount, batchNonce, [mvxTxn1, mvxTxn2, mvxTxn3]);
    });

    it("should return all pending transactions", async function () {
      const pendingTxns = await bridgeExecutor.getPendingTransactions();

      expect(pendingTxns.length).to.equal(3);
      expect(pendingTxns[0][4]).to.equal(mvxTxn1.depositNonce);
      expect(pendingTxns[1][4]).to.equal(mvxTxn2.depositNonce);
      expect(pendingTxns[2][4]).to.equal(mvxTxn3.depositNonce);
    });
  });

  describe("Upgrade works as expected", async function () {
    let amount = 1000;
    let batchNonce = 42;
    let mvxTxn;

    beforeEach(async function () {
      await erc20Safe.deposit(
        genericErc20.address,
        amount,
        Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
      );
      mvxTxn = {
        token: genericErc20.address,
        sender: ethers.encodeBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80n,
        depositNonce: 1,
        callData: generateCallData("increment()", 11000000, [], []),
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
    it("upgrades and has new functions", async function () {
      let valueToCheckAgainst = 100n;

      // Make a deposit to check state persistence
      await bridge.executeTransfer([mvxTxn], batchNonce, signatures);

      let newBridgeExecutor = await upgradeContract(adminWallet, bridgeExecutor.address, "BridgeExecutorUpgrade", [
        valueToCheckAgainst,
      ]);

      expect(await newBridgeExecutor.afterUpgrade()).to.be.eq(valueToCheckAgainst);
      expect((await newBridgeExecutor.getPendingTransactions()).length).to.be.eq(1);
    });
  });
});
