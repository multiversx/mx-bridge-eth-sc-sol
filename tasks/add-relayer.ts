import { task } from "hardhat/config";

task("add-relayer", "Add relayer with given address")
  .addParam("address", "Address of the relayer to be added")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;

    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);
    await bridge.addRelayer(address);
  });
