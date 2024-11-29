import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-ledger";

import "./tasks/accounts";
import "./tasks/clean";
import "./tasks/add-to-whitelist";
import "./tasks/mint-test-tokens";
import "./tasks/set-quorum";
import "./tasks/approve";
import "./tasks/deposit";
import "./tasks/set-min-amount";
import "./tasks/set-max-amount";
import "./tasks/set-batch-block-limit";
import "./tasks/set-batch-size";
import "./tasks/fill-nonce-gap";
import "./tasks/add-relayer";
import "./tasks/remove-relayer";
import "./tasks/pause-bridge";
import "./tasks/unpause-bridge";
import "./tasks/pause-safe";
import "./tasks/unpause-safe";
import "./tasks/init-supply";
import "./tasks/remove-from-whitelist";
import "./tasks/recover-lost-funds";
import "./tasks/get-batch";
import "./tasks/get-batch-deposits";
import "./tasks/get-quorum";
import "./tasks/get-statuses-after-execution";
import "./tasks/depositSC";
import "./tasks/set-batch-settle-limit"
import "./tasks/set-batch-settle-limit-on-bridge"
import "./tasks/deploy";
import "./tasks/token-balance-query"
import "./tasks/get-relayers"
import "./tasks/get-token-properties"
import "./tasks/reset-total-balance"
import "./tasks/mintburn-test-tokens"
import "./tasks/get-safe-parameters"


import { resolve } from "path";

import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const chainIds = {
  goerli: 5,
  sepolia: "sepolia",
  hardhat: 31337,
  mainnet: "mainnet",
};

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;
const initialindex: string | undefined = process.env.INITIAL_INDEX
if (!mnemonic) {
  throw new Error("Please set your MNEMONIC in a .env file");
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

function getETHConfig(network: string, withLedger: boolean): NetworkUserConfig {
  let config: any

  if (withLedger) {
    config = {
      ledgerAccounts: [
        "0x60745fCA64C92c0aBAC5b1bed145204FBF1e9d85",
      ],
      ledgerOptions: {
        derivationFunction: (x: string) => `m/44'/60'/0'/0/${x}`
      },
    };
  } else {
    config = {
      accounts: {
        count: 12,
        mnemonic,
        path: "m/44'/60'/0'/0",
        initialIndex: Number(initialindex),
      },
    };
  }

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

function getBaseConfig(network: string, withLedger: boolean): NetworkUserConfig {
  let config: any

  if (withLedger) {
    config = {
      ledgerAccounts: [
        "0x4408D9f40b9e45d5bE27256Ad71453DeEF043910",
      ],
      ledgerOptions: {
        derivationFunction: (x: string) => `m/44'/60'/0'/0/${x}`
      },
    };
  } else {
    config = {
      accounts: {
        count: 12,
        mnemonic,
        path: "m/44'/60'/0'/0",
        initialIndex: Number(initialindex),
      },
    };
  }

  switch (network) {
    case "testnet":
      config.url = "https://base-sepolia.infura.io/v3/" + infuraApiKey;
      break;
    case "mainnet":
      config.url = "https://base-mainnet.infura.io/v3/" + infuraApiKey;
      break;
    default:
      throw new Error("invalid config option for eth chain");
  }

  return config;
}

function getBSCConfig(network: string, withLedger: boolean): NetworkUserConfig {
  let config: any

  if (withLedger) {
    config = {
      ledgerAccounts: [
        "0x60745fCA64C92c0aBAC5b1bed145204FBF1e9d85",
      ],
      ledgerOptions: {
        derivationFunction: (x: string) => `m/44'/60'/0'/0/${x}`
      },
    };
  } else {
    config = {
      accounts: {
        count: 12,
        mnemonic,
        path: "m/44'/60'/0'/0",
        initialIndex: Number(initialindex),
      },
    };
  }

  switch (network) {
    case "testnet":
      config.url = "https://bsc-testnet.infura.io/v3/" + infuraApiKey;
      break;
    case "mainnet":
      config.url = "https://bsc-mainnet.infura.io/v3/" + infuraApiKey;
      config.gasPrice=3500000000;
      break;
    default:
      throw new Error("invalid config option for bsc chain");
  }

  return config;
}

function getPolygonConfig(network: string): NetworkUserConfig {
  const config = {
    accounts: {
      count: 12,
      mnemonic,
      path: "m/44'/60'/0'/0",
      initialIndex: Number(initialindex),
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
    sepolia: getETHConfig("testnet", false),
    mainnet_eth: getETHConfig("mainnet", false),
    mainnet_eth_ledger: getETHConfig("mainnet", true),
    testnet_bsc: getBSCConfig("testnet", false),
    testnet_bsc_ledger: getBSCConfig("testnet", true),
    mainnet_bsc: getBSCConfig("mainnet",false),
    mainnet_bsc_ledger: getBSCConfig("mainnet", true),
    mumbai: getPolygonConfig("testnet"),
    mainnet_polygon: getPolygonConfig("mainnet"),
    testnet_base: getBaseConfig("testnet", false),
    testnet_base_ledger: getBaseConfig("testnet", true),
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
    target: "ethers-v6",
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
