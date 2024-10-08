import "@nomicfoundation/hardhat-toolbox";
import fs from "fs";

task("get-token-properties", "Returns the token's properties")
  .addParam("address", "Address of the token")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;

    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];

    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const contract = safeContractFactory.attach(safeAddress)

    await contract
      .totalBalances(address)
      .then((balance: any) => {
        console.log(`Token ${address} has a set balance of: ${balance.toString()}`);
      })
      .catch((err: any) => {
        console.log(err);
      });

    await contract
      .mintBalances(address)
      .then((balance: any) => {
        console.log(`Token ${address} has a set mint balance of: ${balance.toString()}`);
      })
      .catch((err: any) => {
        console.log(err);
      });

    await contract
      .burnBalances(address)
      .then((balance: any) => {
        console.log(`Token ${address} has a set burn balance of: ${balance.toString()}`);
      })
      .catch((err: any) => {
        console.log(err);
      });

    await contract
      .nativeTokens(address)
      .then((isNative: any) => {
        console.log(`Token ${address} is native: ${isNative.toString()}`);
      })
      .catch((err: any) => {
        console.log(err);
      });

    await contract
      .mintBurnTokens(address)
      .then((isMintBurn: any) => {
        console.log(`Token ${address} is mint-burn: ${isMintBurn.toString()}`);
      })
      .catch((err: any) => {
        console.log(err);
      });

  });
