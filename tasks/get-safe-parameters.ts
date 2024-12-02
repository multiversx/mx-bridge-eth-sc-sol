import "@nomicfoundation/hardhat-toolbox";
import fs from "fs";

task("get-safe-parameters", "Get the Safe contract parameters").setAction(async (taskArgs, hre) => {
  const fs = require("fs");
  const config = JSON.parse(fs.readFileSync("setup.config.json", "utf8"));
  const safeAddress = config["erc20Safe"];

  const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
  const contract = safeContractFactory.attach(safeAddress)

  console.log(`Safe contract: ${safeAddress}`);

  let value = await contract.batchesCount();
  console.log(`Batches count: ${value}`);

  value = await contract.depositsCount();
  console.log(`Deposits count: ${value}`);

  value = await contract.batchSize();
  console.log(`Batch size: ${value}`);

  value = await contract.batchSettleLimit();
  console.log(`Batch settle limit: ${value}`);

  value = await contract.batchBlockLimit();
  console.log(`Batch block limit: ${value}`);

  const isPaused = await contract.paused();
  console.log(`Is paused: ${isPaused}`);

  const setBridgeAddress = await contract.bridge()
  console.log(`Set bridge address: ${setBridgeAddress}`);
});
