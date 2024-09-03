import "@nomicfoundation/hardhat-toolbox";

task("get-quorum", "Get batch information").setAction(async (taskArgs, hre) => {
  const [adminWallet] = await hre.ethers.getSigners();
  const fs = require("fs");
  const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
  const bridgeAddress = config["bridge"];
  const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
  const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);
  const quorum = await bridge.quorum();
  console.log(quorum);
});
