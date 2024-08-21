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

  const abiCoder = new ethers.AbiCoder();
  const bytesToSign = abiCoder.encode(signMessageDefinition, signMessageData);
  const signData = ethers.keccak256(bytesToSign);

  return ethers.toBeArray(signData);
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
