import { task } from "hardhat/config";
import { ethers } from "ethers";

task("set-max-amount", "Updates minimum amount for depositing an ERC20 token")
  .addParam("address", "Address of the ERC20 token to be whitelisted")
  .addParam("amount", "New amount we want to set (full value, with 18 decimals)")
  .setAction(async (taskArgs, hre) => {
    const tokenAddress = taskArgs.address;
    const amount = taskArgs.amount;

    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);
    await safe.setTokenMaxLimit(tokenAddress, amount);
  });
