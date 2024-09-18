import "@nomicfoundation/hardhat-toolbox";
import { getDeployOptions } from "./args/deployOptions";

task("add-to-whitelist", "Whitelists a new address in the bridge.")
  .addOptionalParam("min", "Minimum amount allowed to transfer this token to MultiversX")
  .addOptionalParam("max", "Maximum amount allowed to transfer this token to MultiversX")
  .addOptionalParam("address", "address to be whitelisted")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .addOptionalParam("mintburn", "flag if the token is mintable/burnable", false, types.boolean)
  .addOptionalParam("native", "flag if the token is native", true, types.boolean)
  .addOptionalParam("totalBalance", "total balance")
  .addOptionalParam("mintBalance", "minted balance")
  .addOptionalParam("burnBalance", "burn balance")
  .setAction(async (taskArgs, hre) => {
    const minAmount = taskArgs.min ?? 25;
    const maxAmount = taskArgs.max ?? 100;
    const address = taskArgs.address;
    const mintBurn = taskArgs.mintburn ?? false;
    const native = taskArgs.native ?? false;
    const totalBalance = taskArgs.totalBalance ?? 0
    const mintBalance = taskArgs.mintBalance ?? 0
    const burnBalance = taskArgs.burnBalance ?? 0
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.whitelistToken(address, minAmount, maxAmount, mintBurn, native, totalBalance, mintBalance, burnBalance, getDeployOptions(taskArgs));

    if (config.tokens === undefined) {
      config.tokens = {};
    }
    config.tokens[address] = { min: minAmount, max: maxAmount };
    fs.writeFileSync(filename, JSON.stringify(config));
    console.log("Token whitelisted: ", address);
  });
