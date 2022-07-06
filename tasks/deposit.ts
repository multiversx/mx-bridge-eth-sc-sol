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
    "0x04c03296b5715019177483c288e65b934f64d904",
    "50000000000",
    Buffer.from("344abc44119cfcace253de05e33c01796c12f96f3bcc52b504b9bc2b96927ceb", "hex"),
    { gasPrice: 10000000000, gasLimit: 500000 },
  );
});
