import { task, types } from "hardhat/config";
import { ethers } from "ethers";

task("deploy-safe", "Deploys ERC20Safe").setAction(async (taskArgs, hre) => {
  const [adminWallet] = await hre.ethers.getSigners();
  console.log("Admin Public Address:", adminWallet.address);

  const ERC20Safe = await hre.ethers.getContractFactory("ERC20Safe");
  const safeContract = await ERC20Safe.deploy();
  await safeContract.deployed();
  console.log("ERC20Safe deployed to:", safeContract.address);

  const fs = require("fs");
  const filename = "setup.config.json";
  const config = JSON.parse(fs.readFileSync(filename, "utf8"));
  config.erc20Safe = safeContract.address;

  fs.writeFileSync(filename, JSON.stringify(config));
});
