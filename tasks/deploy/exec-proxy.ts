import { task } from "hardhat/config";
import { getDeployOptions } from "../args/deployOptions";

task("deploy-exec-proxy", "Deploys the SCExecProxy contract").setAction(async (taskArgs, hre) => {
  const [adminWallet] = await hre.ethers.getSigners();
  console.log("Admin Public Address:", adminWallet.address);

  const fs = require("fs");
  const filename = "setup.config.json";
  const config = JSON.parse(fs.readFileSync(filename, "utf8"));

  const ExecProxy = await hre.ethers.getContractFactory("SCExecProxy");
  let execProxyContract;
  execProxyContract = await ExecProxy.deploy(config.erc20Safe, getDeployOptions(taskArgs));

  await execProxyContract.deployed();
  console.log("SCExecProxy deployed to:", execProxyContract.address);

  config.execProxy = execProxyContract.address;

  fs.writeFileSync(filename, JSON.stringify(config));
});
