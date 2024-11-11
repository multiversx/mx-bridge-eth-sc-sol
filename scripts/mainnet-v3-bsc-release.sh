#!/bin/bash

NETWORK=mainnet_bsc_ledger

cd ..
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

RELAYER_ADDR_0=0x63Cb7F984Ada378089792579bd8a7e7b3Ea848cC
RELAYER_ADDR_1=0x44bC53498D9c8eb6B508e6b07781de6016D1A17c
RELAYER_ADDR_2=0x7abE62822237E1100E093d207f6c0ed378F0d840
RELAYER_ADDR_3=0x6F43Fa161D0A6ae0b4568d6fC967b92e72178de8
RELAYER_ADDR_4=0x451Ff062502e9A95B1dE1E7b98b1a6176Cf026A2
RELAYER_ADDR_5=0xA7E27374390AD4194b1F7641efbB27EbA3aA85D1
RELAYER_ADDR_6=0xFFC32c2A7b1fF986657dd4B7153AB9A421f174BC
RELAYER_ADDR_7=0x91bDdd834195448a762eB5928465e46b0646A01b
RELAYER_ADDR_8=0x461eb4808Fd061e0551172f9A34F17cf3aFE02aB
RELAYER_ADDR_9=0x03030999D1DA9CDFeC6b3Ec9A4AaD4b5724192EA

# DEPLOY & SET contracts

npx hardhat deploy-safe --network $NETWORK
npx hardhat deploy-bridge --relayer-addresses '["'${RELAYER_ADDR_0}'", "'${RELAYER_ADDR_1}'", "'${RELAYER_ADDR_2}'", "'${RELAYER_ADDR_3}'", "'${RELAYER_ADDR_4}'", "'${RELAYER_ADDR_5}'", "'${RELAYER_ADDR_6}'", "'${RELAYER_ADDR_7}'", "'${RELAYER_ADDR_8}'", "'${RELAYER_ADDR_9}'"]' --quorum 7 --network $NETWORK
npx hardhat set-bridge-on-safe --network $NETWORK
npx hardhat unpause-bridge --network $NETWORK
npx hardhat unpause-safe --network $NETWORK

# WHITELIST tokens

#USDC - decimals 18, min 2, max 1000000
npx hardhat add-to-whitelist --min 2000000000000000000 --max 1000000000000000000000000 --address 0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d --mintburn false --native true --limit 200000 --network $NETWORK

#USDT - decimals 18, min 2, max 1000000
npx hardhat add-to-whitelist --min 2000000000000000000 --max 1000000000000000000000000 --address 0x55d398326f99059ff775485246999027b3197955 --mintburn false --native true --limit 200000 --network $NETWORK

#BUSD - decimals 18, min 10, max 1000000
#npx hardhat add-to-whitelist --min 10000000000000000000 --max 1000000000000000000000000 --address 0xe9e7cea3dedca5984780bafc599bd69add087d56 --mintburn false --native true --limit 200000 --network $NETWORK

#TADA - decimals 18, min 90, max 1000000
npx hardhat add-to-whitelist --min 90000000000000000000 --max 1000000000000000000000000 --address 0x9b26e318bc6a2c8b45f5daea2cc14697e0e0f8b5 --mintburn false --native true --limit 200000 --network $NETWORK
