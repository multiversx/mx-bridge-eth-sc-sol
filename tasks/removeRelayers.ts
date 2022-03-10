import { task } from "hardhat/config";

task("removeRelayers", "Remove relayers[start:end]")
  .addParam("start", "start index of the relayer")
  .addParam("end", "end index of the relayer")
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    const start = parseInt(taskArgs.start);
    const end = parseInt(taskArgs.end);
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const [adminWallet] = await hre.ethers.getSigners();
    const bridgeAddress = config["bridge"];
    const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
    const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);

    const relayers = config["relayers"];
    for (let i = start; i < end && i < relayers.length; i++) {
      console.log(`Relayer #${i}: ${relayers[i]} will be removed`);
      await bridge.removeRelayer(relayers[i]);
    }
  });
