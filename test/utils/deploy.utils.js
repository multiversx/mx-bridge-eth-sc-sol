const { ethers, upgrades } = require("hardhat");

async function deployContract(wallet, name, params = []) {
  let contract = await ethers.deployContract(name, params, wallet);

  // Hacky way to update the property on the contract - should remove and replace with target in the end
  contract["address"] = contract.target;
  return contract;
}

async function deployUpgradableContract(wallet, name, params = []) {
  let factory = (await ethers.getContractFactory(name)).connect(wallet);
  let contract = await upgrades.deployProxy(factory, params,{ kind: "transparent" });

  // Hacky way to update the property on the contract - should remove and replace with target in the end
  contract["address"] = contract.target;
  return contract;
}

module.exports = {
  deployContract,
  deployUpgradableContract
}
