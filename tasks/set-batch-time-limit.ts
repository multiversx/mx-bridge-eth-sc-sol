import { task } from "hardhat/config";

task("set-batch-time-limit", "Sets a new batch time limit")
  .addParam("seconds", "new batch time limit in seconds")
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    const seconds = taskArgs.seconds;
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const [adminWallet] = await hre.ethers.getSigners();
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.setBatchTimeLimit(seconds);
  });
