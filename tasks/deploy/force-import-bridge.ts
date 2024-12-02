import "@nomicfoundation/hardhat-toolbox";

task("force-import-bridge", "Imports the Bridge configuration in the .openzeppelin directory. IMPORTANT: use this on the current deployed version of the code")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address: ", adminWallet.address);

    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const bridgeAddress = config["bridge"];
    console.log("Bridge deployed to: ", bridgeAddress);

    const factory = (await hre.ethers.getContractFactory("Bridge")).connect(adminWallet);
    await hre.upgrades.forceImport(bridgeAddress, factory)

    console.log("Bridge imported");
  });
