import "@nomicfoundation/hardhat-toolbox";
import {ethers, upgrades} from "hardhat";
import fs from "fs";

task("upgrade-safe", "Upgrades the ERC20Safe contract")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address: ", adminWallet.address);

    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];
    console.log("ERC20Safe deployed to: ", safeAddress);

    const factory = (await hre.ethers.getContractFactory("ERC20Safe")).connect(adminWallet);
    const upgraded = await hre.upgrades.upgradeProxy(safeAddress, factory); // no additional calls on the upgrade method

    console.log("New ERC20Safe deployed to: ", upgraded.target);
  });
