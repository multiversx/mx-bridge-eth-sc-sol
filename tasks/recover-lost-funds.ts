import { task } from "hardhat/config";

task("recover-lost-funds", "Recover lost funds for a given token")
  .addParam("address", "address to be whitelisted")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);
    const address = taskArgs.address;
    if (taskArgs.price) {
      await safe.recoverLostFunds(address, { gasPrice: taskArgs.price * 1000000000 });
    } else {
      await safe.recoverLostFunds(address);
    }
  });
