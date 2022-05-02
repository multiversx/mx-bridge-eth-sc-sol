import { task } from "hardhat/config";

task(
  "add-to-whitelist",
  "Whitelists a new address in the bridge. Requires setup.config.json to be present (created with the deploy script)",
)
  .addOptionalParam("minAmount", "Minimum amount allowed to transfer this token to Elrond")
  .addOptionalParam("maxAmount", "Maximum amount allowed to transfer this token to Elrond")
  .setAction(async (taskArgs, hre) => {
    const minAmount = taskArgs.minAmount ?? 25;
    const maxAmount = taskArgs.maxAmount ?? 100;
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    for (let token of config["tokens"]) {
      await safe.whitelistToken(token, minAmount, maxAmount);
      console.log("Token whitelisted: ", token);
    }
  });
