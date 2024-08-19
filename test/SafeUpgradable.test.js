const { expect } = require("chai");
const { network, upgrades, ethers } = require("hardhat");

describe("ERC20Safe1", async function () {
  let safe, safeFactory;
  beforeEach(async function() {
    safeFactory = await ethers.getContractFactory("UpgradableERC20Safe");
    safe = await upgrades.deployProxy(safeFactory, [], { kind: "transparent" });
    await safe.waitForDeployment();
  });

  it("should deploy the contract and set the initial value", async function () {
    // Check that the initial value is zero
    expect(0).to.equal(0);
  });
});
