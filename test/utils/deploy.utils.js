const { upgrades, ethers } = require("hardhat");

async function deployContract(wallet, name, params = []) {
  let factory = await ethers.getContractFactory(name);
  let contract = await upgrades.deployProxy(factory, params,{ kind: "transparent" });

  // Hacky way to update the property on the contract - should remove and replace with target in the end
  contract["address"] = contract.target;
  return contract;
}

module.exports = {
  deployContract
}
