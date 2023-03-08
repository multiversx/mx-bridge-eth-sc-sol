import { task } from "hardhat/config";
import { getDeployOptions } from "./args/deployOptions";

task("add-relayer", "Add relayer with given address")
  .addParam("address", "Address of the relayer to be added")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;

    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);

    await bridge.addRelayer(address, getDeployOptions(taskArgs));
    if (config.relayers === undefined) {
      config.relayers = [];
    }
    config.relayers.push(address);
    fs.writeFileSync(filename, JSON.stringify(config));
  });
