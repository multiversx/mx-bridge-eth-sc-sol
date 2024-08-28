#!/bin/bash

export PATH=$PATH:$GOBIN:$GOPATH/bin
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 20
cd ..

yarn set version 1.22.22
yarn install
yarn compile

cp artifacts/contracts/Bridge.sol/Bridge.json abi/contracts/Bridge/Bridge.json
cp artifacts/contracts/Proxy.sol/Proxy.json abi/contracts/Proxy/Proxy.json
cp artifacts/contracts/ERC20Safe.sol/ERC20Safe.json abi/contracts/ERC20Safe/ERC20Safe.json
cp artifacts/contracts/GenericERC20.sol/GenericERC20.json abi/contracts/GenericERC20/GenericERC20.json
cp artifacts/contracts/MintBurnERC20.sol/MintBurnERC20.json abi/contracts/MintBurnERC20/MintBurnERC20.json

jq -r '.abi' abi/contracts/Bridge/Bridge.json > abi/contracts/Bridge/Bridge.abi.json
jq -r '.abi' abi/contracts/Proxy/Proxy.json > abi/contracts/Proxy/Proxy.abi.json
jq -r '.abi' abi/contracts/ERC20Safe/ERC20Safe.json > abi/contracts/ERC20Safe/ERC20Safe.abi.json
jq -r '.abi' abi/contracts/GenericERC20/GenericERC20.json > abi/contracts/GenericERC20/GenericERC20.abi.json
jq -r '.abi' abi/contracts/MintBurnERC20/MintBurnERC20.json > abi/contracts/MintBurnERC20/MintBurnERC20.abi.json

abigen --abi=abi/contracts/Bridge/Bridge.abi.json --pkg=contract --out=abi/contracts/Bridge/Bridge.go --type=Bridge
abigen --abi=abi/contracts/Proxy/Proxy.abi.json --pkg=contract --out=abi/contracts/Proxy/Proxy.go --type=Proxy
abigen --abi=abi/contracts/ERC20Safe/ERC20Safe.abi.json --pkg=contract --out=abi/contracts/ERC20Safe/ERC20Safe.go --type=ERC20Safe
abigen --abi=abi/contracts/GenericERC20/GenericERC20.abi.json --pkg=contract --out=abi/contracts/GenericERC20/GenericERC20.go --type=GenericERC20
abigen --abi=abi/contracts/MintBurnERC20/MintBurnERC20.abi.json --pkg=contract --out=abi/contracts/MintBurnERC20/MintBurnERC20.go --type=MintBurnERC20

jq -r '.bytecode' abi/contracts/Bridge/Bridge.json > abi/contracts/Bridge/Bridge.hex
jq -r '.bytecode' abi/contracts/Proxy/Proxy.json > abi/contracts/Proxy/Proxy.hex
jq -r '.bytecode' abi/contracts/ERC20Safe/ERC20Safe.json > abi/contracts/ERC20Safe/ERC20Safe.hex
jq -r '.bytecode' abi/contracts/GenericERC20/GenericERC20.json > abi/contracts/GenericERC20/GenericERC20.hex
jq -r '.bytecode' abi/contracts/MintBurnERC20/MintBurnERC20.json > abi/contracts/MintBurnERC20/MintBurnERC20.hex
