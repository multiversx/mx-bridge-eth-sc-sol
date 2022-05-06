import { task } from "hardhat/config";

task("add-to-whitelist", "Whitelists a new address in the bridge.")
  .addOptionalParam("minAmount", "Minimum amount allowed to transfer this token to Elrond")
  .addOptionalParam("maxAmount", "Maximum amount allowed to transfer this token to Elrond")
  .addOptionalParam("address", "address to be whitelisted")
  .setAction(async (taskArgs, hre) => {
    const minAmount = taskArgs.minAmount ?? 25;
    const maxAmount = taskArgs.maxAmount ?? 100;
    const address = taskArgs.address;
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.whitelistToken(address, minAmount, maxAmount);
    console.log("Token whitelisted: ", address);
  });
