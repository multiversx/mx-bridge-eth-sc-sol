import { task } from "hardhat/config";
import { ethers } from "ethers";
import { Mnemonic } from "@elrondnetwork/erdjs";

task("initSupply", "Deposits token without sending").setAction(async (taskArgs, hre) => {
  const fs = require("fs");
  const filename = "setup.config.json";
  let config = JSON.parse(fs.readFileSync(filename, "utf8"));
  const [adminWallet] = await hre.ethers.getSigners();
  const safeAddress = config["erc20Safe"];
  const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
  const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);
  const mnemonic: string | undefined = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error("Please set your MNEMONIC in a .env file");
  }
  const elrondMnemonic = Mnemonic.fromString(mnemonic);
  const elrondWallet = elrondMnemonic.deriveKey(0);
  const address = elrondWallet.generatePublicKey().toAddress().pubkey();
  await safe.initSupply("0x58E034203d06896e1375FdaE5e9B135Ce04cb7f8", "100000000000000", { gasLimit: 5000000 });
});
