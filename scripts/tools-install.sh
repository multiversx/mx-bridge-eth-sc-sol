#!/bin/sh

sudo add-apt-repository ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install solc
go install github.com/ethereum/go-ethereum/cmd/abigen@latest
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
nvm install 20
