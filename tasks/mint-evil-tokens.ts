import { task } from "hardhat/config";

task("mint-evil-tokens", "Mints evil token and sends it to the recipientAddress")
  .addParam("address", "Address of wallet to be funded")
  .addParam("token", "Token address of the evil token")
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const address = taskArgs.address;

    const token = "0xA7D5015A43c14D5a492E699bD929C2806b5C87b5";
    console.log("minting tokens for contract: ", token);
    const tokenContract = (await hre.ethers.getContractFactory("EvilERC20")).attach(token);
    await tokenContract.mint(address, 1000000);
    console.log("minted tokens for contract: ", token, address);
  });
