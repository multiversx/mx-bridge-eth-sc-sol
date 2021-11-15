import { task } from "hardhat/config";

task("mint-test-tokens", "Mints tests tokens and sends them to the recipientAddress")
  .addParam("recipientAddress", "Public address where the new tokens will be sent")
  .setAction(async (taskArgs, hre) => {
    const recipientAddress = taskArgs.recipientAddress;
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const addresses = ["0x4F8De9b84F1441efbdbcF37bCb0F106bDfD46Bbc"];

    for (let i = 0; i < config.tokens.length; i++) {
      for (let address of addresses) {
        const tokenContractAddress = config.tokens[i];
        console.log("minting tokens for contract: ", tokenContractAddress);
        const tokenContract = (await hre.ethers.getContractFactory("GenericERC20")).attach(tokenContractAddress);
        await tokenContract.mint(address, 50000000);
        console.log("minted tokens for contract: ", tokenContractAddress, address);
      }
    }
  });
