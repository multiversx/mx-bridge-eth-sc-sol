import { ethers } from "ethers";
import { task } from "hardhat/config";

task("approve", "Approve token").setAction(async (taskArgs, hre) => {
  const fs = require("fs");
  const filename = "setup.config.json";
  let config = JSON.parse(fs.readFileSync(filename, "utf8"));
  const [adminWallet] = await hre.ethers.getSigners();
  const safeAddress = config["erc20Safe"];
  const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
  const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

  const tokenContract = (await hre.ethers.getContractFactory("GenericERC20"))
    .attach(config["tokens"][0])
    .connect(adminWallet);
  await tokenContract.approve(safeAddress, "100000000000000000000");
});
