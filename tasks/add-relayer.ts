import { task } from "hardhat/config";

task("add-relayer", "Add relayer with given address")
  .addParam("address", "Address of the relayer to be added")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;

    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);
    await bridge.addRelayer(address);
    if (config.relayers === undefined) {
      config.relayers = [];
    }
    config.relayers.append(address);
    fs.writeFileSync(filename, JSON.stringify(config));
  });
