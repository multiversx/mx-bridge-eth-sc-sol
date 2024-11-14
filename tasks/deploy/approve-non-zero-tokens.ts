import "@nomicfoundation/hardhat-toolbox";

task("deploy-approve-non-zero-tokens", "Deploys ApproveNonZeroERC20 contracts to use to test the bridge")
  .addParam("name", "Name of the token to deploy")
  .addParam("symbol", "Symbol of the token to deploy")
  .addParam("decimals", "Num of decimals of the token to deploy")
  .setAction(async (taskArgs, hre) => {
    //deploy contracts
    const genericERC20Factory = await hre.ethers.getContractFactory("ApproveNonZeroERC20");

    const tokenName = taskArgs.name;
    const tokenSymbol = taskArgs.symbol;
    const decimals = taskArgs.decimals;

    const usdcContract = await genericERC20Factory.deploy(tokenName, tokenSymbol, decimals);
    console.log("Token deployed to:", usdcContract.target);
  });
