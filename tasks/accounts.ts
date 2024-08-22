import { Signer } from "@ethersproject/abstract-signer";
require("@nomicfoundation/hardhat-toolbox");

task("accounts", "Prints the list of accounts", async (_taskArgs, hre) => {
  const accounts: Signer[] = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});
