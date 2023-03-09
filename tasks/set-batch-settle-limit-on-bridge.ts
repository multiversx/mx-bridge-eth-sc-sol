import { task } from "hardhat/config";

task("set-batch-settle-limit-on-bridge", "Sets a new batch block limit")
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

    if (taskArgs.price) {
      await safe.setBatchBlockLimit(taskArgs.blocks, { gasPrice: taskArgs.price * 1000000000 });
    } else {
      await safe.setBatchBlockLimit(taskArgs.blocks);
    }
    config.batchBlockLimit = taskArgs.blocks;
    fs.writeFileSync(filename, JSON.stringify(config));
  });
