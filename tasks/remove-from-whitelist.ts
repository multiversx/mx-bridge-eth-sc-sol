import { task } from "hardhat/config";

task("remove-from-whitelist", "Removed an already whitelisted address in the bridge.")
  .addParam("address", "address to be whitelisted")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.removeTokenFromWhitelist(address);
    console.log("Token removed: ", address);

    delete config.tokens[address];
    fs.writeFileSync(filename, JSON.stringify(config));
  });
