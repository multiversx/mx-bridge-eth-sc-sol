import { task } from "hardhat/config";

async function trySend(
  signer: { sendTransaction: (arg0: { to: any; value: number; nonce: any; gasPrice: number }) => any },
  address: any,
  nonce: any,
  gasPrice: number,
) {
  try {
    const tx = await signer.sendTransaction({ to: address, value: 0, nonce: nonce, gasPrice: gasPrice });
    console.log(nonce, tx.hash);
  } catch (e: any) {
    if (e.message.includes("replacement fee too low", 0) || e.message === "already known") {
      await trySend(signer, address, nonce, gasPrice * 10);
    }
  }
}

task("fill-nonce-gap", "Fill nonce gap").setAction(async (taskArgs, hre) => {
  const signers = await hre.ethers.getSigners();
  for (let signer of signers) {
    const address = await signer.getAddress();
    const currentNonce = await signer.getTransactionCount();
    const pendingNonce = await signer.getTransactionCount("pending");
    if (currentNonce === pendingNonce) {
      continue;
    }
    console.log(`${address}, gaps: ${pendingNonce - currentNonce}`);
    console.log(`https://ropsten.etherscan.io/address/${address}`);
    for (let nonce = currentNonce; nonce < pendingNonce; nonce++) {
      await trySend(signer, address, nonce, 100000000000);
    }
  }
});
