import { task } from "hardhat/config";
import { getDeployOptions } from "./args/deployOptions";

task("deposit-sc", "Deposits token and sends to safe")
  .addParam("address", "Address of the token to be sent")
  .addParam("amount", "Amount we want to deposit (full value, with decimals)")
  .addParam("receiversc", "Elrond address hex encoded of the receiver")
  .addParam("callData", "data field for MVX SC execution")
  .addParam("mvxGasLimit", "data field for MVX SC execution")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const [adminWallet] = await hre.ethers.getSigners();
    const scExecProxy = config["execProxy"];
    const scExecContactFactory = await hre.ethers.getContractFactory("SCExecProxy");
    const scExecContract = scExecContactFactory.attach(scExecProxy).connect(adminWallet);

    const address = taskArgs.address;
    const amount = taskArgs.amount;
    const receiver = taskArgs.receiversc;
    const callData = taskArgs.callData;

    await scExecContract.deposit(
      address,
      amount,
      Buffer.from(receiver, "hex"),
      callData,
      getDeployOptions(taskArgs),
    );
  });
