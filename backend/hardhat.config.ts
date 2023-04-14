import { config as CONFIG } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";

CONFIG();

const PRIVATE_KEY = process.env.PRIVATE;

const config: HardhatUserConfig = {
  networks: {
    alfajores: {
      url: process.env.DESTINATION_CHAIN_URI,
      accounts: [`${process.env.PRIVATE_KEY}`],
      chainId: 44787,
    },

    binanceTest: {
      url: process.env.ORIGIN_CHAIN_URI,
      accounts: [`${process.env.PRIVATE_KEY}`],
      chainId: 97,
    },
    // hardhat: {
    //   chains: {
      
    //   }
    // }
  },

  namedAccounts: {
    // deployer: String(process.env.DEPLOYER)
    deployer: {
      default: 0,
      44787: `privatekey://${process.env.PRIVATE_KEY}`,
      97: `privatekey://${process.env.PRIVATE_KEY}`
    },
  },

  solidity: {
    version: "0.8.18",
    settings: {          // See the solidity docs for advice about optimization and evmVersion
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "byzantium"
      }
    },
};

export default config;
