import { task } from "hardhat/config";

task("mint-test-tokens", "Mints tests tokens and sends them to the recipientAddress").setAction(
  async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const addresses: string[] = ["0x4F8De9b84F1441efbdbcF37bCb0F106bDfD46Bbc"];

    for (let i = 0; i < config.tokens.length; i++) {
      for (let address of addresses) {
        const tokenContractAddress = config.tokens[i];
        console.log("minting tokens for contract: ", tokenContractAddress);
        const tokenContract = (await hre.ethers.getContractFactory("GenericERC20")).attach(tokenContractAddress);
        await tokenContract.mint(address, 100000000);
        console.log("minted tokens for contract: ", tokenContractAddress, address);
      }
    }
  },
);
