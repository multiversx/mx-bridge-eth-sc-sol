require("@nomicfoundation/hardhat-toolbox");
import { getDeployOptions } from "../args/deployOptions";

task("deploy-mint-burn-tokens", "Deploys MintBurnERC20 contracts to use to the bridge")
  .addParam("name", "Name of the token to deploy")
  .addParam("symbol", "Symbol of the token to deploy")
  .addParam("decimals", "Num of decimals of the token to deploy")
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    console.log("Current contract addresses");
    const safeAddress = config["erc20Safe"];
    const [adminWallet] = await hre.ethers.getSigners();
    //deploy contracts

    const tokenName = taskArgs.name;
    const tokenSymbol = taskArgs.symbol;
    const decimals = taskArgs.decimals;

    const factory = (await hre.ethers.getContractFactory("MintBurnERC20")).connect(adminWallet);
    const usdcContract = await hre.upgrades.deployProxy(factory, [tokenName, tokenSymbol, decimals] ,{ kind: "transparent", ...getDeployOptions(taskArgs) });
    await usdcContract.waitForDeployment();
    console.log("MintBurn token deployed to:", usdcContract.target);

    await usdcContract.grantRole(await usdcContract.MINTER_ROLE(), safeAddress);
  });
