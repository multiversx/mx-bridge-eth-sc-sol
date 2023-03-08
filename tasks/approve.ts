import { ethers } from "ethers";
import { task } from "hardhat/config";
import { getDeployOptions } from "./args/deployOptions";

task("approve", "Approve token")
  .addParam("address", "address to be aproved")
  .addOptionalParam("signers", "Signers count to approve token")
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const fs = require("fs");
    const filename = "setup.config.json";
    let config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];
    const address = taskArgs.address;
    const signersCount = taskArgs.signers ?? 1;
    const signers = await hre.ethers.getSigners();
    for (let i = 0; i < signersCount; i++) {
      const signer = signers[i];
      const tokenContract = (await hre.ethers.getContractFactory("GenericERC20")).attach(address).connect(signer);
      await tokenContract.approve(
        safeAddress,
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        getDeployOptions(taskArgs),
      );
    }
  });
