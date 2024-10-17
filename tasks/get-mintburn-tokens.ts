import "@nomicfoundation/hardhat-toolbox";
import fs from "fs";

task("get-mintburn-tokens", "Returns if the token is mint-burn or not")
  .addParam("address", "Address of the token")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.address;

    const filename = "setup.config.json";
    const config = JSON.parse(fs.readFileSync(filename, "utf8"));
    const safeAddress = config["erc20Safe"];

    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const contract = safeContractFactory.attach(safeAddress)

    await contract
      .mintBurnTokens(address)
      .then((isMintBurn: any) => {
        console.log(`Token ${address} is mint-burn: ${isMintBurn.toString()}`);
      })
      .catch((err: any) => {
        console.log(err);
      });
  });
