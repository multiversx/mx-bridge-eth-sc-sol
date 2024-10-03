import "@nomicfoundation/hardhat-toolbox";
import fs from "fs";

task("native-tokens", "Returns if the token is native or not")
  .addParam("address", "Address of the token")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;

    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];

    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const contract = safeContractFactory.attach(safeAddress)

    await contract
      .nativeTokens(address)
      .then((isNative: any) => {
        console.log(`Token ${address} is native: ${isNative.toString()}`);
      })
      .catch((err: any) => {
        console.log(err);
      });
  });
