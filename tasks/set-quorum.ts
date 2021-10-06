import { task } from "hardhat/config";

task("set-quorum", "Updates the quorum on the Bridge contract")
  .addParam("newQuorumSize", "Integer representing the quorum for a transfer to be considered valid")
  .setAction(async (taskArgs, hre) => {
    const newQuorumSize = taskArgs.newQuorumSize;
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);
    const result = await bridge.setQuorum(newQuorumSize);
    console.log("Quorum updated: ", newQuorumSize);
  });
