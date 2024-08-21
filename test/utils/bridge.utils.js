const { ethers } = require("hardhat");

function getExecuteTransferData(tokenAddresses, recipientAddresses, amounts, depositNonces, batchNonce) {
  const signMessageDefinition = ["address[]", "address[]", "uint256[]", "uint256[]", "uint256", "string"];
  const signMessageData = [
    recipientAddresses,
    tokenAddresses,
    amounts,
    depositNonces,
    batchNonce,
    "ExecuteBatchedTransfer",
  ];

  console.log("1", signMessageData);
  const abiCoder = new ethers.AbiCoder();
  const bytesToSign = abiCoder.encode(signMessageDefinition, signMessageData);
  console.log("2", bytesToSign);
  const signData = ethers.keccak256(bytesToSign);
  console.log("3", signMessageData);
  console.log("4", ethers.toUtf8Bytes(signData));
  throw "thrown";
  return ethers.toUtf8Bytes(signData);
}

async function getSignaturesForExecuteTransfer(
  tokenAddresses,
  recipientAddresses,
  amounts,
  depositNonces,
  batchNonce,
  wallets,
) {
  const dataToSign = getExecuteTransferData(tokenAddresses, recipientAddresses, amounts, depositNonces, batchNonce);
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
