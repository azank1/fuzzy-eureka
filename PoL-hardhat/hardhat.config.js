
import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: "0.8.18",
  networks: {
    localhost: {
      url: "LOCALHOST" //REPLACE WITH LOCAL HOST
      
    }
  }
};

export default config;
