import * as dotenv from "dotenv";
dotenv.config();

import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "solidity-coverage";

const {
  CHAIN_ID,
  RPC_URL,
  PRIVATE_KEY,
  ETHERSCAN_API_KEY,
  CMC_API_KEY
} = process.env;

const sepolia =
  RPC_URL && PRIVATE_KEY
    ? {
        url: RPC_URL,
        accounts: [
          PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
        ],
        chainId: CHAIN_ID ? Number(CHAIN_ID) : 11155111,
      }
    : undefined;

const config = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545" },
    ...(sepolia ? { sepolia } : {}),
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || ""
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: CMC_API_KEY || undefined
  }
};

export default config;
