import { task } from "hardhat/config";

task("deploy-mint-burn-tokens", "Deploys MintBurnERC20 contracts to use to the bridge")
  .addParam("name", "Name of the token to deploy")
  .addParam("symbol", "Symbol of the token to deploy")
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    console.log("Current contract addresses");
    const safeAddress = config["erc20Safe"];
    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(safeAddress);
    console.log("Safe at: ", safe.address);
    //deploy contracts
    const mintBurnERC20Factory = await hre.ethers.getContractFactory("MintBurnERC20");

    const tokenName = taskArgs.name;
    const tokenSymbol = taskArgs.symbol;

    const usdcContract = await mintBurnERC20Factory.deploy(tokenName, tokenSymbol, 18);
    await usdcContract.deployed();
    console.log("MintBurn token deployed to:", usdcContract.address);

    await usdcContract.setSafe(safeAddress);
  });
