import "@nomicfoundation/hardhat-toolbox";

task("get-relayers", "Get the whitelisted relayers").setAction(async (taskArgs, hre) => {
  const [adminWallet] = await hre.ethers.getSigners();
  const fs = require("fs");
  const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
  const bridgeAddress = config["bridge"];
  const bridgeContractFactory = await hre.ethers.getContractFactory("Bridge");
  const bridge = bridgeContractFactory.attach(bridgeAddress).connect(adminWallet);

  const relayers = await bridge.getRelayers();
  console.log("whitelisted relayers:")
  for (let relayer of relayers) {
    console.log(relayer);
  }
});
