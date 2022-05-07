import { task } from "hardhat/config";

task("unpause-bridge", "Unpause the bridge SC").setAction(async (taskArgs, hre) => {
  const [adminWallet] = await hre.ethers.getSigners();
  const fs = require("fs");
  const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
  const bridgeAddress = config["bridge"];
  const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
  const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);
  const result = await bridge.unpause();
});
