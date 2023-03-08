import { task } from "hardhat/config";
import { getDeployOptions } from "./args/deployOptions";

task("pause-bridge", "Pause the bridge SC")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);

    await bridge.pause(getDeployOptions(taskArgs));
  });
