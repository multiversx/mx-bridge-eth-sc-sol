const { ethers } = require("hardhat");

function getExecuteTransferData(mvxTransactions, batchNonce) {
  const mvxTransactionType = "address,bytes32,address,uint256,uint256,bytes";
  const mvxTransactionsType = `(${mvxTransactionType})[]`;
  const signMessageDefinition = [mvxTransactionsType, "uint256", "string"];

  // Prepare the data for encoding
  const mvxTransactionsData = mvxTransactions.map(tx => [
    tx.token,
    tx.sender,
    tx.recipient,
    tx.amount,
    tx.depositNonce,
    tx.callData,
  ]);
  const signMessageData = [mvxTransactionsData, batchNonce, "ExecuteBatchedTransfer"];

  const abiCoder = new ethers.AbiCoder();
  const bytesToSign = abiCoder.encode(signMessageDefinition, signMessageData);
  const signData = ethers.keccak256(bytesToSign);

  return ethers.toBeArray(signData);
}
async function getSignaturesForExecuteTransfer(mvxTransactions, batchNonce, wallets) {
  const dataToSign = getExecuteTransferData(mvxTransactions, batchNonce);
  let signatures = [];
  for (const wallet of wallets) {
    const signature = await wallet.signMessage(dataToSign);
    signatures.push(signature);
  }
  return signatures;
}

module.exports = {
  getExecuteTransferData,
  getSignaturesForExecuteTransfer,
};
