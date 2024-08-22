require("@nomicfoundation/hardhat-toolbox");
import { getDeployOptions } from "./args/deployOptions";

task("add-to-whitelist", "Whitelists a new address in the bridge.")
  .addOptionalParam("min", "Minimum amount allowed to transfer this token to MultiversX")
  .addOptionalParam("max", "Maximum amount allowed to transfer this token to MultiversX")
  .addOptionalParam("address", "address to be whitelisted")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .addOptionalParam("mintburn", "flag if the token is mintable/burnable", false, types.boolean)
  .addOptionalParam("native", "flag if the token is native", true, types.boolean)
  .setAction(async (taskArgs, hre) => {
    const minAmount = taskArgs.min ?? 25;
    const maxAmount = taskArgs.max ?? 100;
    const address = taskArgs.address;
    const mintBurn = taskArgs.mintburn ?? false;
    const native = taskArgs.native ?? false;
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.whitelistToken(address, minAmount, maxAmount, mintBurn, native, getDeployOptions(taskArgs));

    if (config.tokens === undefined) {
      config.tokens = {};
    }
    config.tokens[address] = { min: minAmount, max: maxAmount };
    fs.writeFileSync(filename, JSON.stringify(config));
    console.log("Token whitelisted: ", address);
  });
