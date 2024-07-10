#!/bin/bash

export PATH=$PATH:$GOBIN:$GOPATH/bin
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if test -f ../.env; then
  echo ".env file exists. Nothing to do"
else
  echo "copying .env file from .env.example..."
  cp ../.env.example ../.env
fi

nvm use 20
yarn set version 1.22.22
yarn test
