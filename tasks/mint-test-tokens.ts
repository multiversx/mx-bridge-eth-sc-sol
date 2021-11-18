import { task } from "hardhat/config";

task("mint-test-tokens", "Mints tests tokens and sends them to the recipientAddress").setAction(
  async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const addresses: string[] = ["0x2F6B798539A2465d44802F6116389eD76983Ad52"];

    for (let i = 0; i < config.tokens.length; i++) {
      for (let address of addresses) {
        const tokenContractAddress = config.tokens[i];
        console.log("minting tokens for contract: ", tokenContractAddress);
        const tokenContract = (await hre.ethers.getContractFactory("GenericERC20")).attach(tokenContractAddress);
        await tokenContract.mint(address, 1000000);
        console.log("minted tokens for contract: ", tokenContractAddress, address);
      }
    }
  },
);
