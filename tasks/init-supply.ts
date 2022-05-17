import { task } from "hardhat/config";
import { address } from "hardhat/internal/core/config/config-validation";

task("init-supply", "Deposit the initial supply on a new SC from an old one")
  .addParam("address", "The addres of the token that will be deposited")
  .addParam("amount", "New amount we want to set (full value, with 18 decimals)")
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const address = taskArgs.address;
    const amount = taskArgs.amount;
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);
    const result = await safe.initSupply(address, amount, { gasLimit: 5000000, gasPrice: 247590000000 });
  });
