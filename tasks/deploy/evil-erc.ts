import { task } from "hardhat/config";

task("deploy-evil-erc", "Deploys EvilERC20 contract to use to test the bridge").setAction(async (_, hre) => {
  const fs = require("fs");
  const filename = "setup.config.json";
  const config = JSON.parse(fs.readFileSync(filename, "utf8"));
  console.log("Current contract addresses");
  const safeAddress = config["erc20Safe"];
  const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
  const safe = safeContractFactory.attach(safeAddress);
  console.log("Safe at: ", safe.address);
  // deploy contracts
  const evilERC20Factory = await hre.ethers.getContractFactory("EvilERC20");

  const usdcContract = await evilERC20Factory.deploy("EVILUSDC", "EVILUSDC");
  await usdcContract.deployed();

  //whitelist tokens in safe
  console.log("Whitelisting token ", usdcContract.address);
  await safe.whitelistToken(usdcContract.address, "25000000");
});
