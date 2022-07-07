import { task, types } from "hardhat/config";
import { ethers } from "ethers";

task("deploy-safe", "Deploys ERC20Safe")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address:", adminWallet.address);

    const ERC20Safe = await hre.ethers.getContractFactory("ERC20Safe");
    let safeContract;
    if (taskArgs.price) {
      safeContract = await ERC20Safe.deploy({ gasPrice: taskArgs.price * 1000000000 });
    } else {
      safeContract = await ERC20Safe.deploy();
    }
    await safeContract.deployed();
    console.log("ERC20Safe deployed to:", safeContract.address);

    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    config.erc20Safe = safeContract.address;

    fs.writeFileSync(filename, JSON.stringify(config));
  });
