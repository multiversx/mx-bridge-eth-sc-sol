import "@nomicfoundation/hardhat-toolbox";
import { getDeployOptions } from "../args/deployOptions";

task("deploy-safe", "Deploys ERC20Safe")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address:", adminWallet.address);

    const ERC20Safe = (await hre.ethers.getContractFactory("ERC20Safe")).connect(adminWallet);
    const safeContract = await hre.upgrades.deployProxy(ERC20Safe, { kind: "transparent", ...getDeployOptions(taskArgs) });

    await safeContract.waitForDeployment();
    console.log("ERC20Safe deployed to:", safeContract.target);

    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    config.erc20Safe = safeContract.target;

    fs.writeFileSync(filename, JSON.stringify(config));
  });
