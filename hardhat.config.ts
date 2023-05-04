import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-preprocessor";
import fs from "fs";
import 'hardhat-deploy';
import "@nomiclabs/hardhat-ethers";


const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
      }
    }
  },
  paths: {
    cache: "./cache_hardhat",
  },
  preprocess: {
    eachLine: (hre) => ({
      transform: (line: string) => {
        if (line.match(/^\s*import /i)) {
          for (const [from, to] of getRemappings()) {
            if (line.includes(from)) {
              line = line.replace(from, to);
              break;
            }
          }
        }
        return line;
      },
    }),
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
        accountsBalance: "1000000000000000000000000000", //1_000_000_000 Ether
      },
      mining:{
        auto: true,
        interval: 500
      }
    }
  },
  namedAccounts: {
    deployer: {
      owner: 0,
    }
  }
};

export default config;

function getRemappings() {
 return fs
     .readFileSync("remappings.txt", "utf8")
     .split("\n")
     .filter(Boolean)
     .map((line) => line.trim().split("="));
}