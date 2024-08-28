import "@nomicfoundation/hardhat-toolbox";

task("deploy-test-tokens", "Deploys ERC20 contracts to use to test the bridge")
  .addParam("name", "Name of the token to deploy")
  .addParam("symbol", "Symbol of the token to deploy")
  .addParam("decimals", "Num of decimals of the token to deploy")
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
    const genericERC20Factory = await hre.ethers.getContractFactory("GenericERC20");

    const tokenName = taskArgs.name;
    const tokenSymbol = taskArgs.symbol;
    const decimals = taskArgs.decimals;

    const usdcContract = await genericERC20Factory.deploy(tokenName, tokenSymbol, decimals);
    console.log("Token deployed to:", usdcContract.getAddress());
  });
