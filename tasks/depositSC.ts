import { task } from "hardhat/config";
import { getDeployOptions } from "./args/deployOptions";
import { encodeCallData } from "@multiversx/sdk-js-bridge";
task("deposit-sc", "Deposits token and sends to safe")
  .addParam("address", "Address of the token to be sent")
  .addParam("amount", "Amount we want to deposit (full value, with decimals)")
  .addParam("sc", "MultiversX address hex encoded of the receiver")
  .addParam("endpoint", "data field for MVX SC execution")
  .addParam("gaslimit", "data field for MVX SC execution")
  .addParam("args", "data field for MVX SC execution")
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
    const receiver = taskArgs.sc;
    const endpoint = taskArgs.endpoint;
    const gaslimit = taskArgs.gaslimit;
    const args = JSON.parse(taskArgs.args);

    const callData = encodeCallData(endpoint, gaslimit, args);
   await safe.depositWithSCExecution(
      address,
      amount,
      Buffer.from(receiver, "hex"),
      callData,
      getDeployOptions(taskArgs),
    );
  });
