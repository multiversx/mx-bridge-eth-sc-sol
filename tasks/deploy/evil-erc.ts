import "@nomicfoundation/hardhat-toolbox";

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

  //whitelist tokens in safe
  console.log("Whitelisting token ", usdcContract.target);
  await safe.whitelistToken(usdcContract.target, "25000000", "100000000000", false, true, 0, 0, 0);
});
