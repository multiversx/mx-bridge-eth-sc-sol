import "@nomicfoundation/hardhat-toolbox";

task("token-balance-query", "Query the balance of the provided address for the defined tokens")
  .addParam("address", "Address for the balance query")
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const address = taskArgs.address;

    console.log("Querying ERC20 balance of the address", address);
    for (let token of config["tokens"]) {
      const tokenContract = (await hre.ethers.getContractFactory("GenericERC20")).attach(token);
      await tokenContract.balanceOf(address)
        .then((balance: any) => {
          console.log(`Balance of token ${token.toString()}: ${balance.toString()}`);
        })

    }
  });
