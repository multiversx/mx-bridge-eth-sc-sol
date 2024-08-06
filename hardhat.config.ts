import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";
import "hardhat-log-remover";
import "hardhat-tracer";
import "hardhat-abi-exporter";

import { resolve } from "path";

import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const chainIds = {
  goerli: 5,
  sepolia: "sepolia",
  hardhat: 31337,
  mainnet: 1,
};

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

function getETHConfig(network: string): NetworkUserConfig {
  let config = {
    accounts: {
      count: 12,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    url: "https://" + chainIds.sepolia + ".infura.io/v3/" + infuraApiKey,
  };

  switch (network) {
    case "testnet":
      config.url = "https://" + chainIds.sepolia + ".infura.io/v3/" + infuraApiKey;
      break;
    case "mainnet":
      config.url = "https://" + chainIds.mainnet + ".infura.io/v3/" + infuraApiKey;
      break;
    default:
      throw new Error("invalid config option for eth chain");
  }

  return config;
}

function getBSCConfig(network: string): NetworkUserConfig {
  let config = {
    accounts: {
      count: 12,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
  };

  switch (network) {
    case "testnet":
      config.url = "https://data-seed-prebsc-1-s1.binance.org:8545";
      break;
    case "mainnet":
      config.url = "https://bsc-dataseed.binance.org";
      break;
    default:
      throw new Error("invalid config option for bsc chain");
  }

  return config;
}

function getPolygonConfig(network: string): NetworkUserConfig {
  let config = {
    accounts: {
      count: 12,
      mnemonic,
      path: "m/44'/60'/0'/0",
    },
    url: "https://polygon-mumbai.infura.io/v3/" + infuraApiKey,
  };

  switch (network) {
    case "testnet":
      config.url = "https://polygon-mumbai.infura.io/v3/" + infuraApiKey;
      break;
    case "mainnet":
      config.url = "https://polygon-rpc.com";
      break;
    default:
      throw new Error("invalid config option for polygon chain");
  }

  return config;
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  gasReporter: {
    currency: "USD",
    enabled: !!process.env.REPORT_GAS,
    coinmarketcap: process.env.CMC_TOKEN || "26043cba-19e3-4a70-8575-916adb54fa12",
    excludeContracts: [],
    src: "./contracts",
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      chainId: chainIds.hardhat,
    },
    sepolia: getETHConfig("testnet"),
    mainnet_eth: getETHConfig("mainnet"),
    testnet_bsc: getBSCConfig("testnet"),
    mainnet_bsc: getBSCConfig("mainnet"),
    mumbai: getPolygonConfig("testnet"),
    mainnet_polygon: getPolygonConfig("mainnet"),
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.20",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/solidity-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  abiExporter: {
    path: "./abi",
    clear: true,
    flat: false,
    only: [":Bridge$", ":ERC20Safe$", ":SCExecProxy$"],
    pretty: false,
  },
};

export default config;
