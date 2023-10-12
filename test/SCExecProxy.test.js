const { waffle, ethers, network } = require("hardhat");
const { expect } = require("chai");
const { provider, deployContract } = waffle;
const { smock } = require("@defi-wonderland/smock");

const BridgeContract = require("../artifacts/contracts/Bridge.sol/Bridge.json");
const ERC20SafeContract = require("../artifacts/contracts/ERC20Safe.sol/ERC20Safe.json");
const GenericERC20 = require("../artifacts/contracts/GenericERC20.sol/GenericERC20.json");
const SCExecProxy = require("../artifacts/contracts/SCExecProxy.sol/SCExecProxy.json");
const RevertingSafe = require("../artifacts/contracts/test/SafeMock/RevertingSafe.sol/RevertingSafe.json");

describe("Bridge", async function () {
  const [adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet] =
    provider.getWallets();
  const boardMembers = [adminWallet, relayer1, relayer2, relayer3, relayer5, relayer6, relayer7, relayer8].map(
    m => m.address,
  );
  const quorum = 7;

  let erc20Safe, bridge, genericErc20, scExec;

  async function setupContracts() {
    erc20Safe = await deployContract(adminWallet, ERC20SafeContract);
    bridge = await deployContract(adminWallet, BridgeContract, [boardMembers, quorum, erc20Safe.address]);
    scExec = await deployContract(adminWallet, SCExecProxy, [erc20Safe.address]);

    await erc20Safe.setBridge(bridge.address);
    await bridge.unpause();
    await setupErc20Token();
  }

  async function setupErc20Token() {
    genericErc20 = await deployContract(adminWallet, GenericERC20, ["TSC", "TSC"]);
    await genericErc20.mint(adminWallet.address, 1000);
    await genericErc20.approve(erc20Safe.address, 1000);
    await genericErc20.approve(scExec.address, 1000);
    await erc20Safe.whitelistToken(genericErc20.address, 0, 100);
    await erc20Safe.unpause();
  }

  beforeEach(async function () {
    await setupContracts();
  });

  describe("depost", function () {
    it("should revert when safe reverts", async function () {
      const revertingSafe = await deployContract(adminWallet, RevertingSafe, []);
      await scExec.setSafe(revertingSafe.address);

      await expect(
        scExec
          .connect(adminWallet)
          .deposit(
            genericErc20.address,
            10,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
            "dyr",
          ),
      ).to.be.revertedWith("reverting_safe");

      // Revert back to original safe
      await scExec.setSafe(erc20Safe.address);
    });

    it("should emit event in case of deposit success", async function () {
      await expect(
        scExec
          .connect(adminWallet)
          .deposit(
            genericErc20.address,
            25,
            Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
            "dyr",
          ),
      )
        .to.emit(scExec, "ERC20SCDeposit")
        .withArgs(1, 1, "dyr");
    });
  });
});
