import { ethers } from "ethers";
import { task } from "hardhat/config";

task("approve", "Approve token").setAction(async (taskArgs, hre) => {
  const fs = require("fs");
  const filename = "setup.config.json";
  let config = JSON.parse(fs.readFileSync(filename, "utf8"));
  const safeAddress = config["erc20Safe"];

  const signers = await hre.ethers.getSigners();
  for (let signer of signers) {
    for (let token of config["tokens"]) {
      const tokenContract = (await hre.ethers.getContractFactory("GenericERC20")).attach(token).connect(signer);
      await tokenContract.approve(safeAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    }
  }
});
