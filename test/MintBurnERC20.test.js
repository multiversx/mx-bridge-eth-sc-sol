const { expect } = require("chai");
const { waffle, network } = require("hardhat");
const { provider, deployContract } = waffle;

const ERC20SafeContract = require("../artifacts/contracts/ERC20Safe.sol/ERC20Safe.json");
const MintBurnERC20Contract = require("../artifacts/contracts/MintBurnERC20.sol/MintBurnERC20.json");
const BridgeContract = require("../artifacts/contracts/Bridge.sol/Bridge.json");
const { getSignaturesForExecuteTransfer } = require("./utils/bridge.utils");

describe("ERC20Safe, MintBurnERC20, and Bridge Interaction", function () {
  const [adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet] =
    provider.getWallets();
  const boardMembers = [
    adminWallet,
    relayer1,
    relayer2,
    relayer3,
    relayer4,
    relayer5,
    relayer6,
    relayer7,
    relayer8,
  ].map(m => m.address);
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
    mintBurnErc20 = await deployContract(adminWallet, MintBurnERC20Contract, ["Test Token", "TST", 6]);
    await erc20Safe.whitelistToken(mintBurnErc20.address, 0, 100, true, false);
    await erc20Safe.unpause();
  }

  beforeEach(async function () {
    await setupContracts();
  });

  describe("should burn tokens on deposit to ERC20Safe", async function () {
    let amount, batchNonce, signatures;
    beforeEach(async function () {
      amount = 80;
      batchNonce = 42;
      signatures = await getSignaturesForExecuteTransfer(
        [mintBurnErc20.address],
        [otherWallet.address],
        [amount],
        [1],
        batchNonce,
        [adminWallet, relayer1, relayer2, relayer3, relayer5, relayer6, relayer7, relayer8],
      );
    });

    it("transfer is set as REJECTED when ERC20Safe does not have the minter role", async function () {
      // check that transfer is set as REJECTED when ERC20Safe does not have the minter role
      // Get initial balance of the otherWallet
      const initialBalanceOtherWallet = await mintBurnErc20.balanceOf(otherWallet.address);

      // Execute the transfer
      await bridge.executeTransfer(
        [mintBurnErc20.address],
        [otherWallet.address],
        [amount],
        [1],
        batchNonce,
        signatures,
      );

      // Get final balance of the otherWallet
      const finalBalanceOtherWallet = await mintBurnErc20.balanceOf(otherWallet.address);

      // Assert that the balance hasn't changed
      expect(initialBalanceOtherWallet).to.equal(finalBalanceOtherWallet);

      const settleBlockCount = await bridge.batchSettleBlockCount();
      for (let i = 0; i < settleBlockCount; i++) {
        await network.provider.send("evm_mine");
      }

      // check that the transfer is set as REJECTED
      const [transfers, isFinal] = await bridge.getStatusesAfterExecution(batchNonce);
      expect(transfers[0]).to.equal(4);
      expect(isFinal).to.be.true
    });

    it("transfer is set as Executed when ERC20Safe does have the minter role", async function () {
      await mintBurnErc20.grantRole(await mintBurnErc20.MINTER_ROLE(), erc20Safe.address);
      await expect(() =>
        bridge.executeTransfer([mintBurnErc20.address], [otherWallet.address], [amount], [1], batchNonce, signatures),
      ).to.changeTokenBalance(mintBurnErc20, otherWallet, amount);

      const settleBlockCount = await bridge.batchSettleBlockCount();
      for (let i = 0; i < settleBlockCount; i++) {
        await network.provider.send("evm_mine");
      }

      // check that the transfer is set as Executed
      const [transfers, isFinal] = await bridge.getStatusesAfterExecution(batchNonce);
      console.log(transfers);
      expect(transfers[0]).to.equal(3);
      expect(isFinal).to.be.true
    });

    it("deposit not should work when ERC20Safe does not have enough allowance", async function () {
      await mintBurnErc20.grantRole(await mintBurnErc20.MINTER_ROLE(), erc20Safe.address);
      await expect(() =>
        bridge.executeTransfer([mintBurnErc20.address], [otherWallet.address], [amount], [1], batchNonce, signatures),
      ).to.changeTokenBalance(mintBurnErc20, otherWallet, amount);

      await expect(
        erc20Safe
          .connect(otherWallet)
          .deposit(
            mintBurnErc20.address,
            amount,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          ),
      ).to.revertedWith("ERC20InsufficientAllowance");
    });

    it("deposit should work when ERC20Safe has enough allowance", async function () {
      await mintBurnErc20.grantRole(await mintBurnErc20.MINTER_ROLE(), erc20Safe.address);
      await expect(() =>
        bridge.executeTransfer([mintBurnErc20.address], [otherWallet.address], [amount], [1], batchNonce, signatures),
      ).to.changeTokenBalance(mintBurnErc20, otherWallet, amount);

      await mintBurnErc20.connect(otherWallet).approve(erc20Safe.address, amount);
      await expect(
        erc20Safe
          .connect(otherWallet)
          .deposit(
            mintBurnErc20.address,
            amount,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
          ),
      ).to.changeTokenBalance(mintBurnErc20, otherWallet, -amount);
    });
  });
});
