import { task } from "hardhat/config";

task("fill-nonce-gap", "Fill nonce gap").setAction(async (taskArgs, hre) => {
  const signers = await hre.ethers.getSigners();
  for (let signer of signers) {
    const address = await signer.getAddress();
    const currentNonce = await signer.getTransactionCount();
    const pendingNonce = await signer.getTransactionCount("pending");
    console.log(`${address}, gaps: ${pendingNonce - currentNonce}`);
    console.log(`https://ropsten.etherscan.io/address/${address}`);
    for (let nonce = currentNonce + 1; nonce <= pendingNonce; nonce++) {
      signer.sendTransaction({ to: address, value: 0, nonce: nonce });
    }
  }
});
