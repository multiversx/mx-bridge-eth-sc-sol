import { task } from "hardhat/config";

task("pause-safe", "Pause the safe SC").setAction(async (taskArgs, hre) => {
  const [adminWallet] = await hre.ethers.getSigners();
  const fs = require("fs");
  const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
  const safeAddress = config["erc20Safe"];
  const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
  const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);
  const result = await safe.pause();
});
