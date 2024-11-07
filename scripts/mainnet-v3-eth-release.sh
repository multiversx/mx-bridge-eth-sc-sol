#!/bin/bash

NETWORK=mainnet_eth_ledger

cd ..
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

RELAYER_ADDR_0=0xC20291c893EFcb737e7d83D2DA00eD9482a90367
RELAYER_ADDR_1=0xbF1d834c3878857987Cc715A03A2136e530ba117
RELAYER_ADDR_2=0xE5f085Baef52c864fa002aFb4ca43d13D7a07874
RELAYER_ADDR_3=0x1eefBE434ddBf6c3B13Ad030105862f5a52F49da
RELAYER_ADDR_4=0xFFB0b190b8b0cd861fa5F9485F673addaA44b761
RELAYER_ADDR_5=0x719C80f0eCaa94B96c1404A6886b570Dd266b2A0
RELAYER_ADDR_6=0xb8Ae5fB88E0EFB17cA5572a97334a89BB761886C
RELAYER_ADDR_7=0x64a5579Db74fA934f5B64489F9CaeC98Ea4C6370
RELAYER_ADDR_8=0x4e14d424D44B55670e04808B29447b343612336E
RELAYER_ADDR_9=0x197018843776e2465E2335f796779BE5012B7949

# DEPLOY & SET contracts

npx hardhat deploy-safe --network $NETWORK
npx hardhat deploy-bridge --relayer-addresses '["'${RELAYER_ADDR_0}'", "'${RELAYER_ADDR_1}'", "'${RELAYER_ADDR_2}'", "'${RELAYER_ADDR_3}'", "'${RELAYER_ADDR_4}'", "'${RELAYER_ADDR_5}'", "'${RELAYER_ADDR_6}'", "'${RELAYER_ADDR_7}'", "'${RELAYER_ADDR_8}'", "'${RELAYER_ADDR_9}'"]' --quorum 7 --network $NETWORK
npx hardhat set-bridge-on-safe --network $NETWORK
npx hardhat unpause-bridge --network $NETWORK
npx hardhat unpause-safe --network $NETWORK

# WHITELIST tokens

#USDC - decimals 6, min 50, max 1000000
npx hardhat add-to-whitelist --min 50000000 --max 1000000000000 --address 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 --mintburn false --native true --limit 200000 --network $NETWORK

#UTK - decimals 18, min 660, max 402500
npx hardhat add-to-whitelist --min 660000000000000000000 --max 402500000000000000000000 --address 0xdc9ac3c20d1ed0b540df9b1fedc10039df13f99c --mintburn false --native true --limit 200000 --network $NETWORK

#USDT - decimals 6, min 50, max 1000000
npx hardhat add-to-whitelist --min 50000000 --max 1000000000000 --address 0xdac17f958d2ee523a2206206994597c13d831ec7 --mintburn false --native true --limit 200000 --network $NETWORK

#BUSD - decimals 18, min 50, max 50000
#npx hardhat add-to-whitelist --min 50000000000000000000 --max 50000000000000000000000 --address 0x4fabb145d64652a948d72533023f6e7a623c7c53 --mintburn false --native true --limit 200000 --network $NETWORK

#HMT - decimals 18, min 870, max 872750
npx hardhat add-to-whitelist --min 870000000000000000000 --max 872750000000000000000000 --address 0xd1ba9bac957322d6e8c07a160a3a8da11a0d2867 --mintburn false --native true --limit 200000 --network $NETWORK

#CGG - decimals 18, min 630, max 635000
npx hardhat add-to-whitelist --min 630000000000000000000 --max 635000000000000000000000 --address 0x1fe24f25b1cf609b9c4e7e12d802e3640dfa5e43 --mintburn false --native true --limit 200000 --network $NETWORK

#INFRA - decimals 18, min 100, max 100000
npx hardhat add-to-whitelist --min 100000000000000000000 --max 100000000000000000000000 --address 0x013062189dc3dcc99e9cee714c513033b8d99e3c --mintburn false --native true --limit 200000  --network $NETWORK

#WBTC - decimals 8, min 0.0019234, max 2
npx hardhat add-to-whitelist --min 192340 --max 200000000 --address 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599 --mintburn false --native true --limit 200000 --network $NETWORK

#WETH - decimals 18, min 0.0284374, max 28.5
npx hardhat add-to-whitelist --min 28437400000000000 --max 28500000000000000000 --address 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 --mintburn false --native true --limit 200000 --network $NETWORK

#WSDAI - decimals 18, min 50, max 50000
npx hardhat add-to-whitelist --min 50000000000000000000 --max 50000000000000000000000 --address 0x83f20f44975d03b1b09e64809b757c47f942beea --mintburn false --native true --limit 200000 --network $NETWORK

#WDAI - decimals 18, min 50, max 1000000
npx hardhat add-to-whitelist --min 50000000000000000000 --max 1000000000000000000000000 --address 0x6b175474e89094c44da98b954eedeac495271d0f --mintburn false --native true --limit 200000 --network $NETWORK

#UMB - decimals 18, min 2000, max 1650000
npx hardhat add-to-whitelist --min 2000000000000000000000 --max 1650000000000000000000000 --address 0x6fc13eace26590b80cccab1ba5d51890577d83b2 --mintburn false --native true --limit 200000 --network $NETWORK

