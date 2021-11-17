import { task } from "hardhat/config";

task("deploy-test-tokens", "Deploys ERC20 contracts to use to test the bridge").setAction(async (_, hre) => {
  const fs = require("fs");
  const filename = "setup.config.json";
  const config = JSON.parse(fs.readFileSync(filename, "utf8"));
  console.log("Current contract addresses");
  console.log(config);
  const safeAddress = config["erc20Safe"];
  const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
  const safe = safeContractFactory.attach(safeAddress);
  console.log("Safe at: ", safe.address);
  //deploy contracts
  const genericERC20Factory = await hre.ethers.getContractFactory("GenericERC20");

  const usdcContract = await genericERC20Factory.deploy("USDC", "USDC");
  await usdcContract.deployed();
  console.log("Deployed USDC: ", usdcContract.address);
  const daiContract = await genericERC20Factory.deploy("Dummy DAI", "dDAI");
  await daiContract.deployed();
  console.log("Deployed dummy DAI: ", daiContract.address);
  const egldContract = await genericERC20Factory.deploy("Dummy EGLD", "dEGLD");
  await egldContract.deployed();
  console.log("Deployed dummy EGLD: ", egldContract.address);

  //whitelist tokens in safe
  console.log("Whitelisting token ", usdcContract.address);
  await safe.whitelistToken(usdcContract.address, "50000000000000000000");

  //save in configuration file
  config.tokens = [usdcContract.address];
  fs.writeFileSync(filename, JSON.stringify(config));
});
