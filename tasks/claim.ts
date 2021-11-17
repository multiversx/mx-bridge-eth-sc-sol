import { task } from "hardhat/config";

task("check-claim", "Check if a user can claim a token back")
  .addParam("token", "Address of the ERC20 token to be whitelisted")
  .addParam("safe", "Address of the ERC20 token to be whitelisted")
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();

    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(taskArgs.safe).connect(adminWallet);

    await safe.getRefundAmount(taskArgs.token);
  });

task("claim", "Deposits token and sends to safe")
  .addParam("token", "Address of the ERC20 token to be whitelisted")
  .addParam("safe", "Address of the ERC20 token to be whitelisted")
  .setAction(async (taskArgs, hre) => {
    const [adminWallet] = await hre.ethers.getSigners();

    const safeContractFactory = await hre.ethers.getContractFactory("ERC20Safe");
    const safe = safeContractFactory.attach(taskArgs.safe).connect(adminWallet);

    await safe.claimRefund(taskArgs.token);
  });
