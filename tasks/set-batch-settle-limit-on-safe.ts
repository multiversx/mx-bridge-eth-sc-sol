require("@nomicfoundation/hardhat-toolbox");
import { getDeployOptions } from "./args/deployOptions";

task("set-batch-settle-limit-on-safe", "Sets a new batch settle limit")
  .addParam("blocks", "new batch settle limit")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const [adminWallet] = await hre.ethers.getSigners();
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.setBatchSettleLimit(taskArgs.blocks, getDeployOptions(taskArgs));

    config.batchBlockLimit = taskArgs.blocks;
    fs.writeFileSync(filename, JSON.stringify(config));
  });
