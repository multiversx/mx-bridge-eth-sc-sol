import { task } from "hardhat/config";

task("get-statuses-after-execution", "Get statuses of the swaps after execution from a given batch")
  .addParam("batch", "Id of the batch")
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);
    const batch = parseInt(taskArgs.batch);
    const result = await bridge.getStatusesAfterExecution(batch);
    console.log(result);
  });
