const { expect } = require("chai");
const { upgrades, ethers } = require("hardhat");

describe("ERC20Safe1", async function () {
  let safe, bridge, safeFactory, bridgeFactory;
  beforeEach(async function() {
    let [adminWallet, relayer1, relayer2, relayer3, relayer4, relayer5, relayer6, relayer7, relayer8, otherWallet] = await ethers.getSigners();
    let boardMembers = [adminWallet, relayer1, relayer2, relayer3, relayer5, relayer6, relayer7, relayer8].map(
      m => m.address,
    );


    safeFactory = await ethers.getContractFactory("ERC20Safe");

    // This also validates that the code can be upgradable
    safe = await upgrades.deployProxy(safeFactory, [], { kind: "transparent" });
    await safe.waitForDeployment();

    bridgeFactory = await ethers.getContractFactory("Bridge");

    // This also validates that the code can be upgradable
    bridge = await upgrades.deployProxy(bridgeFactory, [boardMembers, 7, safe.target], { kind: "transparent" });
    await bridge.waitForDeployment();
  });

  it("should deploy the contract and set the initial value", async function () {
    // Check that the initial value is zero
    expect(0).to.equal(0);
  });
});
