import { task, types } from "hardhat/config";

task("set-bridge-on-safe", "Set")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const [adminWallet] = await hre.ethers.getSigners();
    const safeAddress = config["erc20Safe"];
    const bridgeAddress = config["bridge"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);
    const gasPrice = (taskArgs.price ?? 0) * 1000000000;
    await safe.setBridge(bridgeAddress, { gasPrice: gasPrice });
  });
