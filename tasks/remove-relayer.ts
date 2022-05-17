import { task } from "hardhat/config";

task("remove-relayer", "Remove relayer with given address")
  .addParam("address", "Address of the relayer to be removed")
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
    const gasPrice = taskArgs.price * 1000000000;
    await bridge.removeRelayer(address, { gasPrice: gasPrice });
    if (config.relayers !== undefined) {
      config.relayers = config.relayers.filter((relayerAddress: string) => relayerAddress !== address);
    }
    fs.writeFileSync(filename, JSON.stringify(config));
  });
