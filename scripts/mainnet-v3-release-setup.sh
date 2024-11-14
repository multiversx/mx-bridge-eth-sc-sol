#!/bin/bash
# CLEANUP

cd ..
rm -rf artifacts
rm -rf cache
rm -rf .yarn/cache
rm .yarn/install-state.gz

# COMPILE new SC
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
yarn set version 1.22.22
nvm use 20
yarn install
yarn compile
