import { task } from "hardhat/config";
import { getDeployOptions } from "./args/deployOptions";

task("add-to-whitelist", "Whitelists a new address in the bridge.")
  .addOptionalParam("min", "Minimum amount allowed to transfer this token to Elrond")
  .addOptionalParam("max", "Maximum amount allowed to transfer this token to Elrond")
  .addOptionalParam("address", "address to be whitelisted")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const minAmount = taskArgs.min ?? 25;
    const maxAmount = taskArgs.max ?? 100;
    const address = taskArgs.address;
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.whitelistToken(address, minAmount, maxAmount, getDeployOptions(taskArgs));

    if (config.tokens === undefined) {
      config.tokens = {};
    }
    config.tokens[address] = { min: minAmount, max: maxAmount };
    fs.writeFileSync(filename, JSON.stringify(config));
    console.log("Token whitelisted: ", address);
  });
