import "@nomicfoundation/hardhat-toolbox";

task("get-batch-deposits", "Get deposits of the given batch ID")
  .addParam("batch", "Id of the batch")
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);
    const batchId = taskArgs.batch;
    let result = await safe.getDeposits(batchId);
    console.log(result);

    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);
    result = await bridge.getBatchDeposits(batchId);
    console.log(result);
  });
