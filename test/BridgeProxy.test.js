const { waffle, ethers, network } = require("hardhat");
const { expect } = require("chai");
const { provider, deployContract } = waffle;

const BridgeContract = require("../artifacts/contracts/Bridge.sol/Bridge.json");
const ERC20SafeContract = require("../artifacts/contracts/ERC20Safe.sol/ERC20Safe.json");
const GenericERC20 = require("../artifacts/contracts/GenericERC20.sol/GenericERC20.json");
const BridgeProxy = require("../artifacts/contracts/BridgeProxy.sol/BridgeProxy.json");
const { getSignaturesForExecuteTransfer, getExecuteTransferData } = require("./utils/bridge.utils");
const { BigNumber } = require("ethers");

describe("BridgeProxy", function () {
  const [adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet] =
    provider.getWallets();
  const boardMembers = [adminWallet, relayer1, relayer2, relayer3, relayer5, relayer6, relayer7, relayer8].map(
    m => m.address,
  );
  const quorum = 7;

  let erc20Safe, bridge, bridgeProxy, genericErc20;

  async function setupContracts() {
    erc20Safe = await deployContract(adminWallet, ERC20SafeContract);
    bridgeProxy = await deployContract(adminWallet, BridgeProxy);
    bridge = await deployContract(adminWallet, BridgeContract, [
      boardMembers,
      quorum,
      erc20Safe.address,
      bridgeProxy.address,
    ]);
    await erc20Safe.setBridge(bridge.address);
    await bridgeProxy.setBridge(bridge.address);
    await bridge.unpause();
    await bridgeProxy.unpause();
    await setupErc20Token();
  }

  async function setupErc20Token() {
    genericErc20 = await deployContract(adminWallet, GenericERC20, ["TSC", "TSC", 6]);
    await genericErc20.mint(adminWallet.address, 1000);
    await genericErc20.approve(erc20Safe.address, 1000);
    await erc20Safe.whitelistToken(genericErc20.address, 0, 1000, false, true);
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

  // Generic function to generate calldata
  function generateCallData(functionSignature, gasLimit, argTypes, argValues) {
    // Compute the function selector
    const functionSelector = ethers.utils.id(functionSignature).slice(0, 10); // First 4 bytes of the hash

    // Encode the function arguments
    const args = ethers.utils.defaultAbiCoder.encode(argTypes, argValues);

    // Encode the full calldata with function selector, gas limit, and arguments
    const callDataEncoded = ethers.utils.defaultAbiCoder.encode(
      ["bytes", "uint256", "bytes"],
      [functionSelector, gasLimit, args],
    );

    return callDataEncoded;
  }

  const checkForEmptyTransaction = async pendingTxn => {
    expect(pendingTxn[0]).to.equal(ethers.constants.AddressZero);
    expect(pendingTxn[1]).to.equal(ethers.constants.HashZero);
    expect(pendingTxn[2]).to.equal(ethers.constants.AddressZero);
    expect(pendingTxn[3]).to.equal(0);
    expect(pendingTxn[4]).to.equal(0);
    expect(pendingTxn[5]).to.equal("0x");
    expect(pendingTxn[6]).to.equal(false);
  };

  beforeEach(async function () {
    await setupContracts();
  });
  it("sets creator as admin", async function () {
    expect(await bridgeProxy.admin()).to.equal(adminWallet.address);
  });
  it("sets bridge address", async function () {
    expect(await bridgeProxy.bridge()).to.equal(bridge.address);
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
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80,
        depositNonce: 1,
        callData: "0x",
        isScRecipient: true,
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
      await expect(bridgeProxy.connect(otherWallet).deposit(mvxTxn)).to.be.revertedWith(
        "Access Control: sender is not Bridge",
      );
    });
    it("reverts when contract is paused", async function () {
      await bridgeProxy.pause();
      await expect(bridge.executeTransfer([mvxTxn], batchNonce, signatures)).to.be.revertedWith("Pausable: paused");
    });
    it("should successfully deposit a pending transactions", async function () {
      await bridge.executeTransfer([mvxTxn], batchNonce, signatures);

      const pendingTxn = await bridgeProxy.getPendingTransactionById(0);

      expect(pendingTxn[0]).to.equal(mvxTxn.token);
      expect(pendingTxn[1]).to.equal(mvxTxn.sender);
      expect(pendingTxn[2]).to.equal(mvxTxn.recipient);
      expect(pendingTxn[3]).to.equal(mvxTxn.amount);
      expect(pendingTxn[4]).to.equal(mvxTxn.depositNonce);
      expect(pendingTxn[5]).to.equal(mvxTxn.callData);
      expect(pendingTxn[6]).to.equal(mvxTxn.isScRecipient);
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
      await bridgeProxy.pause();
      await expect(bridgeProxy.execute(0)).to.be.revertedWith("Pausable: paused");
    });
    it("reverts when called with bad transaction id", async function () {
      await expect(bridgeProxy.execute(arrayOfTxn.length + 1)).to.be.revertedWith(
        "BridgeProxy: Invalid transaction ID",
      );
    });
    it("reverts when transaction's amount is 0", async function () {
      mvxTxnNoAmount = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 0,
        depositNonce: 4,
        callData: "0x",
        isScRecipient: true,
      };
      arrayOfTxn.push(mvxTxnNoAmount);

      await prepareAndExecuteTransfer(amount, batchNonce, arrayOfTxn);

      await expect(bridgeProxy.execute(0)).to.be.revertedWith("BridgeProxy: No amount bridged");
    });
    it("should gracefully finish execution and refund if calldata is empty", async function () {
      const mvxTxnWithoutCalldata = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80,
        depositNonce: 1,
        callData: "0x",
        isScRecipient: true,
      };
      arrayOfTxn.push(mvxTxnWithoutCalldata);
      await prepareAndExecuteTransfer(amount, batchNonce, arrayOfTxn);

      //check balance before and after execute
      const beforeBalance = await genericErc20.balanceOf(bridge.address);
      await bridgeProxy.execute(0);
      const afterBalance = await genericErc20.balanceOf(bridge.address);

      expect(afterBalance).to.equal(beforeBalance + BigNumber.from(mvxTxnWithoutCalldata.amount));

      // check for pending transaction to be removed after refund
      const pendingTxn = await bridgeProxy.getPendingTransactionById(0);
      checkForEmptyTransaction(pendingTxn);
    });

    it("should gracefully finish execution and refund if calldata is invalid", async function () {
      const badFunctionSignature = "mint(uint256,uint256)";
      const gasLimit = 11000000;
      const argTypes = ["uint256", "uint256"];
      const argValues = [0, 999];

      const mvxTxnWithInvalidCalldata = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80,
        depositNonce: 2,
        callData: generateCallData(badFunctionSignature, gasLimit, argTypes, argValues),
        isScRecipient: true,
      };
      arrayOfTxn.push(mvxTxnWithInvalidCalldata);
      await prepareAndExecuteTransfer(amount, batchNonce, arrayOfTxn);

      const beforeBalance = await genericErc20.balanceOf(bridge.address);
      await bridgeProxy.execute(0);
      const afterBalance = await genericErc20.balanceOf(bridge.address);

      expect(afterBalance).to.equal(beforeBalance + BigNumber.from(mvxTxnWithInvalidCalldata.amount));

      // check for pending transaction to be removed after refund
      const pendingTxn = await bridgeProxy.getPendingTransactionById(0);
      checkForEmptyTransaction(pendingTxn);
    });

    it("should gracefully finish execution and refund if calldata exists but endpoint is empty or gas limit is invalid (zero or below minimum)", async function () {
      const functionSignature = "mint(address,uint256)";
      const argTypes = ["address", "uint256"];
      const argValues = [otherWallet.address, 999];

      const mvxTxnWithZeroGas = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80,
        depositNonce: 2,
        callData: generateCallData(functionSignature, 0, argTypes, argValues),
        isScRecipient: true,
      };

      const mvxTxnWithInsufficientGas = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80,
        depositNonce: 2,
        callData: generateCallData(functionSignature, 2000000, argTypes, argValues),
        isScRecipient: true,
      };

      const mvxTxnWithEmptyEndpoint = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80,
        depositNonce: 2,
        callData: generateCallData("", 11000000, argTypes, argValues),
        isScRecipient: true,
      };

      arrayOfTxn = [mvxTxnWithEmptyEndpoint, mvxTxnWithZeroGas, mvxTxnWithInsufficientGas];
      await prepareAndExecuteTransfer(240, batchNonce, arrayOfTxn);

      await bridgeProxy.execute(0);
      await bridgeProxy.execute(1);
      await bridgeProxy.execute(2);

      // check for pending transaction to be removed after refund
      checkForEmptyTransaction(bridgeProxy.getPendingTransactionById(0));
      checkForEmptyTransaction(bridgeProxy.getPendingTransactionById(1));
      checkForEmptyTransaction(bridgeProxy.getPendingTransactionById(2));
    });

    it("should successfully execute transaction with proper encoded calldata", async function () {
      const amountToBeMinted = 999;
      const functionSignature = "mint(address,uint256)";
      const gasLimit = 11000000;
      const argTypes = ["address", "uint256"];
      const argValues = [otherWallet.address, amountToBeMinted];
      mvxTxnWithCalldata = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: genericErc20.address,
        amount: 80,
        depositNonce: 1,
        callData: generateCallData(functionSignature, gasLimit, argTypes, argValues),
        isScRecipient: true,
      };
      arrayOfTxn.push(mvxTxnWithCalldata);
      await prepareAndExecuteTransfer(amount, batchNonce, arrayOfTxn);

      // check the otherWallet' balance of the token that have been intended to be minted
      const beforeBalance = await genericErc20.balanceOf(otherWallet.address);
      await bridgeProxy.execute(0);
      const afterBalance = await genericErc20.balanceOf(otherWallet.address);

      expect(afterBalance).to.equal(beforeBalance + BigNumber.from(amountToBeMinted));
    });
  });

  describe("getPendingTransactionById", function () {
    let amount = 1000;
    let batchNonce = 42;
    let mvxTxn;

    beforeEach(async function () {
      mvxTxn = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80,
        depositNonce: 1,
        callData: "0x",
        isScRecipient: true,
      };
      await prepareAndExecuteTransfer(amount, batchNonce, [mvxTxn]);
    });

    it("should return the transaction with the given id", async function () {
      const pendingTxn = await bridgeProxy.getPendingTransactionById(0);

      expect(pendingTxn[0]).to.equal(mvxTxn.token);
      expect(pendingTxn[1]).to.equal(mvxTxn.sender);
      expect(pendingTxn[2]).to.equal(mvxTxn.recipient);
      expect(pendingTxn[3]).to.equal(mvxTxn.amount);
      expect(pendingTxn[4]).to.equal(mvxTxn.depositNonce);
      expect(pendingTxn[5]).to.equal(mvxTxn.callData);
      expect(pendingTxn[6]).to.equal(mvxTxn.isScRecipient);
    });
  });

  describe("getPendingTransactions", function () {
    let amount = 1000;
    let batchNonce = 42;
    let mvxTxn1, mvxTxn2;

    beforeEach(async function () {
      mvxTxn1 = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80,
        depositNonce: 1,
        callData: "0x",
        isScRecipient: true,
      };
      mvxTxn2 = {
        token: genericErc20.address,
        sender: ethers.utils.formatBytes32String("senderAddress"),
        recipient: otherWallet.address,
        amount: 80,
        depositNonce: 2,
        callData: "0x",
        isScRecipient: true,
      };
      await prepareAndExecuteTransfer(amount, batchNonce, [mvxTxn1, mvxTxn2]);
    });

    it("should return all pending transactions", async function () {
      const pendingTxns = await bridgeProxy.getPendingTransaction();

      expect(pendingTxns.length).to.equal(2);
      expect(pendingTxns[0][0]).to.equal(mvxTxn1.token);
      expect(pendingTxns[1][0]).to.equal(mvxTxn2.token);
    });
  });
});
