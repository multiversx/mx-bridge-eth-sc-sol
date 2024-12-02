import "@nomicfoundation/hardhat-toolbox";

task("set-batch-settle-limit-on-bridge", "Sets a new batch block limit - for MultiversX finality check")
  .addParam("blocks", "new batch settle limit")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const [adminWallet] = await hre.ethers.getSigners();
    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);

    if (taskArgs.price) {
      await bridge.setBatchSettleLimit(taskArgs.blocks, { gasPrice: taskArgs.price * 1000000000 });
    } else {
      await bridge.setBatchSettleLimit(taskArgs.blocks);
    }
    config.batchBlockLimit = taskArgs.blocks;
    fs.writeFileSync(filename, JSON.stringify(config));
  });
