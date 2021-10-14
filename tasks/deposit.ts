import { ethers } from "ethers";
import { task } from "hardhat/config";

task("deposit", "Deposits token and sends to safe").setAction(async (taskArgs, hre) => {
  const fs = require("fs");
  const filename = "setup.config.json";
  let config = JSON.parse(fs.readFileSync(filename, "utf8"));
  const [adminWallet] = await hre.ethers.getSigners();
  const safeAddress = config["erc20Safe"];
  const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
  const safe = safeContractFactory.attach(safeAddress).connect(adminWallet);

  await safe.deposit(
    config["tokens"][0],
    "50000000000000000000",
    ethers.utils.toUtf8Bytes("erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6tg"),
  );
});
