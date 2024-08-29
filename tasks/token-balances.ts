import "@nomicfoundation/hardhat-toolbox";

task("token-balances", "Deposits token and sends to safe")
  .addParam("address", "Address of the token to be sent")
  .addParam("safe", "Address of the token to be sent")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;
    const safeAddress = taskArgs.safe;
    const fs = require("fs");
    const abi = JSON.parse(fs.readFileSync("abi/contracts/ERC20Safe/ERC20Safe.abi.json", "utf8"));
    const contract = new hre.ethers.Contract(safeAddress, abi);

    await contract
      .tokenBalances(address)
      .then((balance: any) => {
        console.log(`Balance of token ${address}: ${balance.toString()}`);
      })
      .catch((err: any) => {
        console.log(err);
      });
  });
