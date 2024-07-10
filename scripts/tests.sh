#!/bin/bash

export PATH=$PATH:$GOBIN:$GOPATH/bin
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 20
yarn set version 1.22.22
yarn test
