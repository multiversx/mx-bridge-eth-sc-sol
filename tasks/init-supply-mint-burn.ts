import "@nomicfoundation/hardhat-toolbox";
import { getDeployOptions } from "./args/deployOptions";

task("init-supply-mint-burn", "Deposit the initial supply on a new SC from an old one")
  .addParam("address", "The addres of the token that will be deposited")
  .addParam("mintamount", "New mint amount we want to set (full denominated value, with all decimals)")
  .addParam("burnamount", "New burn amount we want to set (full denominated value, with all decimals)")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    const fs = require("fs");
    const address = taskArgs.address;
    const mintAmount = taskArgs.mintamount;
    const burnAmount = taskArgs.burnamount;
    const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

    await safe.initSupplyMintBurn(address, mintAmount, burnAmount, getDeployOptions(taskArgs));
  });
