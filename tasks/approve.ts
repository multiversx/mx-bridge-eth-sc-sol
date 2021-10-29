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

  // const tokenContract = (await hre.ethers.getContractFactory("GenericERC20"))
  //   .attach("0xFdC31b53DD4122562f724bb21da487798E93CBee")
  //   .connect(adminWallet);
  // await tokenContract.approve(safeAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

  const signers = await hre.ethers.getSigners();
  let count = 0;
  for (let signer of signers) {
    count++;
    // if (count < 11) {
    //   continue;
    // }
    for (let token of config["tokens"]) {
      const tokenContract = (await hre.ethers.getContractFactory("GenericERC20")).attach(token).connect(signer);
      await tokenContract.approve(safeAddress, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    }
  }
});
