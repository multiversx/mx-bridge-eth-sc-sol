import { task } from "hardhat/config";

task("mint-test-tokens", "Mints tests tokens and sends them to the recipientAddress")
  .addParam("recipientAddress", "Public address where the new tokens will be sent")
  .setAction(async (taskArgs, hre) => {
    const recipientAddress = taskArgs.recipientAddress;
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));

    for (let i = 0; i < config.tokens.length; i++) {
      const tokenContractAddress = config.tokens[i];
      console.log("minting tokens for contract: ", tokenContractAddress);
      const tokenContract = (await hre.ethers.getContractFactory("GenericERC20")).attach(tokenContractAddress);
      await tokenContract.brrr(recipientAddress);
      console.log("minted tokens for contract: ", tokenContractAddress);
    }
  });
