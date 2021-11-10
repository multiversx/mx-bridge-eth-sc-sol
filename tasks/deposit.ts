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

  // console.log('sending from', adminWallet.address);
  // const relayers = ["0xb6e20ff4ae7d29be233d874633f2f0dcb326e5c0","0x8609d4db3ce70b1a2969e55c6973a12ffc58d454","0xee96e2234edd26dc96bc8dc9a51a513b4e7d62e2","0x02b04cef8fab044c2b518b1ac215b36498686cb3","0xcb2f834ae3bf9c8004ea82109c5b77b2b4bfb69a","0x7e7d4bf7a15cec824ce2d4467491be52f0274c3c","0x824c1813d9e8ba9875bee2b8aceb52fb8486c1ff", "0x9214a60a6b14fbd80ec77f2dbd03c3a295687e15", "0x04add2648743cbdd40c221df0ab1f63124345391", "0xf79e68efaeb0d2d38270493c9f04f94081fc1030"];
  // for (let relayer of relayers) {
  //   await adminWallet.sendTransaction({to: relayer, value: ethers.utils.parseUnits("10", "ether")});
  // }

  console.log(await safe.getNextPendingBatch());

  // await safe.deposit(
  //   "0xFDaB99347AF193F2e9e4dB4cD4f8DF9F2Bf86917",
  //   "50000000000000000000",
  //   Buffer.from("c0f0058cea88a2bc1240b60361efb965957038d05f916c42b3f23a2c38ced81e", "hex"),
  // );
});
