const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { provider, deployContract } = waffle;

const ERC20SafeContract = require("../artifacts/contracts/ERC20Safe.sol/ERC20Safe.json");
const MintBurnERC20Contract = require("../artifacts/contracts/MintBurnERC20.sol/MintBurnERC20.json");
const BridgeContract = require("../artifacts/contracts/Bridge.sol/Bridge.json");

describe("ERC20Safe, MintBurnERC20, and Bridge Interaction", function () {
  const [
    adminWallet,
    receiverWallet,
    relayer1,
    relayer2,
    relayer3,
    relayer4,
    relayer5,
    relayer6,
    relayer7,
    relayer8,
    otherWallet,
  ] = provider.getWallets();
  const boardMembers = [adminWallet, relayer1, relayer2, relayer3, relayer5, relayer6, relayer7, relayer8].map(
    m => m.address,
  );
  const quorum = 7;

  let erc20Safe, bridge, mintBurnErc20;

  async function setupContracts() {
    erc20Safe = await deployContract(adminWallet, ERC20SafeContract);
    bridge = await deployContract(adminWallet, BridgeContract, [boardMembers, quorum, erc20Safe.address]);
    await erc20Safe.setBridge(bridge.address);
    await bridge.unpause();
    await setupErc20Token();
  }

  async function setupErc20Token() {
    mintBurnErc20 = await deployContract(adminWallet, MintBurnERC20Contract, ["Test Token", "TST", 18]);
    await mintBurnErc20.setSafe(erc20Safe.address);
    await erc20Safe.whitelistToken(mintBurnErc20.address, 0, 100, true);
    await erc20Safe.unpause();
  }

  beforeEach(async function () {
    await setupContracts();
  });

  describe("should burn tokens on deposit to ERC20Safe", async function () {
    let amount, batchNonce, signatures;
    let dataToSign, signature1, signature2, signature3, signature4, signature5, signature6, signature7;
    beforeEach(async function () {
      amount = 80;
      batchNonce = 42;
      signatures = await getSignaturesForExecuteTransfer(
        [mintBurnErc20.address],
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

    it("mints & burn tokens", async function () {
      await expect(() =>
        bridge.executeTransfer([mintBurnErc20.address], [otherWallet.address], [amount], [1], batchNonce, signatures),
      ).to.changeTokenBalance(mintBurnErc20, otherWallet, amount);

      await erc20Safe
        .connect(otherWallet)
        .deposit(
          mintBurnErc20.address,
          amount,
          Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
        );

      const initialBalance = await mintBurnErc20.balanceOf(otherWallet.address);
      // Check that the initial balance was `amount`
      expect(initialBalance).to.equal(0);
    });
  });
});
