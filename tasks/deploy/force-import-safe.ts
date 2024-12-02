import "@nomicfoundation/hardhat-toolbox";

task("force-import-safe", "Imports the ERC20Safe configuration in the .openzeppelin directory. IMPORTANT: use this on the current deployed version of the code")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address: ", adminWallet.address);

    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];
    console.log("ERC20Safe deployed to: ", safeAddress);

    const factory = (await hre.ethers.getContractFactory("ERC20Safe")).connect(adminWallet);
    await hre.upgrades.forceImport(safeAddress, factory)

    console.log("ERC20Safe imported");
  });
