import { task } from "hardhat/config";

task("set-batch-size", "Sets a new batch size")
  .addParam("size", "new batch size")
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    const size = taskArgs.size;
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const [adminWallet] = await hre.ethers.getSigners();
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.setBatchSize(size);
    config.batchSize = size;
    fs.writeFileSync(filename, JSON.stringify(config));
  });
