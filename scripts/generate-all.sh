#!/bin/bash

export PATH=$PATH:$GOBIN:$GOPATH/bin
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

mkdir -p ../built-artifacts/
mkdir -p ../built-artifacts/go-wrappers
mkdir -p ../built-artifacts/hex
mkdir -p ../built-artifacts/abi

abigen --abi=../abi/contracts/Bridge.sol/Bridge.json --pkg=contract --out=Bridge.go --type=Bridge
mv Bridge.go ../built-artifacts/go-wrappers
cp ../abi/contracts/Bridge.sol/Bridge.json ../built-artifacts/abi

abigen --abi=../abi/contracts/ERC20Safe.sol/ERC20Safe.json --pkg=contract --out=ERC20Safe.go --type=ERC20Safe
mv ERC20Safe.go ../built-artifacts/go-wrappers/ERC20Safe.go
cp ../abi/contracts/ERC20Safe.sol/ERC20Safe.json ../built-artifacts/abi

abigen --abi=../abi/contracts/GenericERC20.sol/GenericERC20.json --pkg=contract --out=GenericERC20.go --type=GenericERC20
mv GenericERC20.go ../built-artifacts/go-wrappers
cp ../abi/contracts/GenericERC20.sol/GenericERC20.json ../built-artifacts/abi

abigen --abi=../abi/contracts/MintBurnERC20.sol/MintBurnERC20.json --pkg=contract --out=MintBurnERC20.go --type=MintBurnERC20
mv MintBurnERC20.go ../built-artifacts/go-wrappers
cp ../abi/contracts/MintBurnERC20.sol/MintBurnERC20.json ../built-artifacts/abi

abigen --abi=../abi/contracts/SCExecProxy.sol/SCExecProxy.json --pkg=contract --out=SCExecProxy.go --type=SCExecProxy
mv SCExecProxy.go ../built-artifacts/go-wrappers
cp ../abi/contracts/SCExecProxy.sol/SCExecProxy.json ../built-artifacts/abi

nvm use 20
cd ..
npm install
npm run compile

cd artifacts/contracts
jq -r '.bytecode' Bridge.sol/Bridge.json > Bridge.hex
jq -r '.bytecode' ERC20Safe.sol/ERC20Safe.json > ERC20Safe.hex
jq -r '.bytecode' GenericERC20.sol/GenericERC20.json > GenericERC20.hex
jq -r '.bytecode' MintBurnERC20.sol/MintBurnERC20.json > MintBurnERC20.hex
jq -r '.bytecode' SCExecProxy.sol/SCExecProxy.json > SCExecProxy.hex
mv *.hex ../../built-artifacts/hex/
