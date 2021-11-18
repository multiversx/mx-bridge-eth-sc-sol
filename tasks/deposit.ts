import { task } from "hardhat/config";
import { ethers } from "ethers";

task("deposit", "Deposits token and sends to safe").setAction(async (taskArgs, hre) => {
  const fs = require("fs");
  const filename = "setup.config.json";
  let config = JSON.parse(fs.readFileSync(filename, "utf8"));
  const [adminWallet] = await hre.ethers.getSigners();
  const safeAddress = config["erc20Safe"];
  const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
  const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

  await safe.deposit(
    "0xd1135C0307CEB01FD4728db8e5B8D38fbf984F9a",
    "100000000000000000000",
    Buffer.from("8435c3bc7cec141b87633a87551a766e866255e82cbfa2a4610fea0c88ae5483", "hex"),
  );
});
