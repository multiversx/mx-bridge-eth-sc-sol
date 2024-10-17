import "@nomicfoundation/hardhat-toolbox";

task("mintburn-test-tokens", "Mints tests tokens and sends them to the recipientAddress")
  .addParam("address", "Address of wallet to be funded")
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const address = taskArgs.address;

    for (let token of config["tokens"]) {
      console.log("minting tokens for contract: ", token);
      const tokenContract = (await hre.ethers.getContractFactory("MintBurnERC20")).attach(token);

      await tokenContract.mint(address, "10000000000000000");
      console.log("minted tokens for contract: ", token, address);
    }
  });
