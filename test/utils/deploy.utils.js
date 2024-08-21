const { ethers } = require("hardhat");

async function deployContract(wallet, name, params = []) {
  let factory = await ethers.getContractFactory(name);
  let contract = await ethers.deployContract(name, params);

  // Hacky way to update the property on the contract - should remove and replace with target in the end
  contract["address"] = contract.target;
  return contract;
}

module.exports = {
  deployContract
}
