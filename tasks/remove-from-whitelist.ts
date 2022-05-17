import { task } from "hardhat/config";

task("remove-from-whitelist", "Removed an already whitelisted address in the bridge.")
  .addOptionalParam("address", "address to be whitelisted")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.removeTokenFromWhitelist(address);
    console.log("Token whitelisted: ", address);
  });
