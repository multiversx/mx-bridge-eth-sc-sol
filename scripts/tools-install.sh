#!/bin/bash

RED='\x1B[0;31m'
NC='\x1B[0m'
GO_NEEDED="go1.21.0"

if ! [ -x "$(command -v go)" ]; then
  echo -e "${RED}GO is not installed on your system${NC}"
  exit
else
  GOVERSION=$(go version | awk '{print $3}')
  if [[ "$GOVERSION" < "$GO_NEEDED" ]]; then
    echo -e "${RED}$GO_NEEDED or higher is not installed your system${NC}"
  fi
fi

sudo add-apt-repository ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install solc
go install github.com/ethereum/go-ethereum/cmd/abigen@latest
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
. $HOME/.nvm/nvm.sh
nvm install 20

if test -f ../.env; then
  echo ".env file exists."
else
  cp ../.env.example ../.env
fi

