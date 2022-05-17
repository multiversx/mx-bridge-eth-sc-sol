import { task } from "hardhat/config";

task("remove-from-whitelist", "Removed an already whitelisted address in the bridge.")
  .addParam("address", "address to be whitelisted")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    const gasPrice = taskArgs.price * 1000000000;
    await safe.removeTokenFromWhitelist(address, { gasPrice: gasPrice });
    console.log("Token removed: ", address);

    delete config.tokens[address];
    fs.writeFileSync(filename, JSON.stringify(config));
  });
