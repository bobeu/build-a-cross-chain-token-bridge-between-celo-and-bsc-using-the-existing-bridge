import { TransactionReceipt } from "@ethersproject/providers";
import { BigNumber, BigNumberish, Wallet } from "ethers";
import { ethers } from "hardhat";
import Web3 from "web3";


const str = (x:string|undefined) => String(x);

// To connncet to Ganache, we will set the HttpsProvider url to http://127.0.0.1 which run on port 8545
const LOCAL_HTTPPROVIDER_URL = new Web3.providers.HttpProvider("http://127.0.0.1:8545");

const ALFAJORES_SOCKET_URL = "wss://alfajores-forno.celo-testnet.org/ws";
const BINANCE_HTTP_URL = "https://data-seed-prebsc-2-s1.binance.org:8545";

// Construct a new instance of the Celo's Websocket provider.
const CELO_PROVIDER = new Web3.providers.WebsocketProvider(ALFAJORES_SOCKET_URL);
const BSC_PROVIDER = new Web3.providers.HttpProvider(BINANCE_HTTP_URL);


// Set up provider
const rpcInfo = Object.assign({}, {
  CELOALFAJORES: {
    name: 'Alfajores',
    rpc: ALFAJORES_SOCKET_URL,
    chainId: 44787,
  },
  BSC_TESTNET: {
    name: 'BSC Testnet',
    rpc:BINANCE_HTTP_URL,
    chainId: 97

  }
})

const waitForTransaction = async function (trx: any) {
  console.log("Waiting for confirmation ...");
  return await trx.wait(2);
}

const accounts = (web3: Web3, pKeyDeployer: string, pKeyUser: string) => {
  const deployer = web3.eth.accounts.privateKeyToAccount(pKeyDeployer);
  const user = web3.eth.accounts.privateKeyToAccount(pKeyUser);

  return {deployer, user}
}

// We create a new web3 instance parsing the provider as an argument.
const getWeb3Instance = function() {
  const web3_celo = new Web3(CELO_PROVIDER);
  const web3_bsc = new Web3(BSC_PROVIDER);

  return { web3_celo, web3_bsc }
}

// Providers function using ethers
export function getProviders() {
  const celoProvider = new ethers.providers.WebSocketProvider(
    rpcInfo.CELOALFAJORES.rpc, 
    {
      chainId: rpcInfo.CELOALFAJORES.chainId,
      name: rpcInfo.CELOALFAJORES.name,
    }
    );
    
  const bscProvider = new ethers.providers.JsonRpcProvider(
    rpcInfo.BSC_TESTNET.rpc,
    {
      chainId: rpcInfo.BSC_TESTNET.chainId,
      name: rpcInfo.BSC_TESTNET.name,  
    }
  );

  const localWeb3Provider = new Web3(LOCAL_HTTPPROVIDER_URL);
  

  // // We'll use web3.js to listen to events on both chains
  // const web3Provider_celo = new Web3(rpcInfo.CELOALFAJORES.rpc);
  // const web3Provider_bsc = new Web3(rpcInfo.BSC_TESTNET.rpc);
    
  return { 
    str,
    accounts,
    celoProvider, 
    bscProvider, 
    ethers,
    Web3,
    waitForTransaction,
    localWeb3Provider,
    getWeb3Instance,
  }
}
