import { task, types } from "hardhat/config";
import { ethers } from "ethers";
import fs from "fs";
import { getDeployOptions } from "../args/deployOptions";

task("deploy-bridge", "Deploys the Bridge contract")
  .addParam(
    "relayerAddresses",
    "JSON Array containing all relayer addresses to be added when the Bridge contract is deployed",
  )
  .addOptionalParam("quorum", "Quorum for proposals to be able to execute", 3, types.int)
  .addOptionalParam("price", "Gas price in gwei for this transaction", undefined)
  .setAction(async (taskArgs, hre) => {
    const relayerAddresses: string[] = JSON.parse(taskArgs.relayerAddresses);
    const quorum = taskArgs.quorum;
    console.log("Relayers used for deploy", relayerAddresses);
    console.log("Quorum used for relay", quorum);
    const [adminWallet] = await hre.ethers.getSigners();
    console.log("Admin Public Address:", adminWallet.address);

    const fs = require("fs");
    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));

    const Bridge = await hre.ethers.getContractFactory("Bridge");
    let bridgeContract;
    bridgeContract = await Bridge.deploy(relayerAddresses, quorum, config.erc20Safe, getDeployOptions(taskArgs));

    await bridgeContract.deployed();
    console.log("Bridge deployed to:", bridgeContract.address);

    config.bridge = bridgeContract.address;
    config.relayers = relayerAddresses;

    fs.writeFileSync(filename, JSON.stringify(config));
  });
