import { task } from "hardhat/config";
import { ethers } from "ethers";

task("deposit", "Deposits token and sends to safe")
  .addParam("address", "Address of the token to be sent")
  .addParam("amount", "Amount we want to deposit (full value, with decimals)")
  .addParam("receiver", "Elrond address hex encoded of the receiver")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const [adminWallet] = await hre.ethers.getSigners();
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    const address = taskArgs.address;
    const amount = taskArgs.amount;
    const receiver = taskArgs.receiver;
    if (taskArgs.price) {
      await safe.deposit(address, amount, Buffer.from(receiver, "hex"), { gasPrice: taskArgs.price * 1000000000 });
    } else {
      await safe.deposit(address, amount, Buffer.from(receiver, "hex"));
    }
  });
