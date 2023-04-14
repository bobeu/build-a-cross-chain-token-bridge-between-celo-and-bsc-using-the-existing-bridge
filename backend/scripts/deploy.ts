import { getProviders } from "./network";
import { Transaction } from "ethers";
import celoBridge from "../artifacts/contracts/CeloBridge.sol/CeloBridge.json";
import bscBridge from "../artifacts/contracts/BSCBridge.sol/BSCBridge.json";
import cBGT from "../artifacts/contracts/tokens/BSCbBGT.sol/BSCbBGT.json";
import bBGT from "../artifacts/contracts/tokens/CelocBGT.sol/CelocBGT.json";

async function main() {
  const { 
    str,
    Web3,
    ethers,
    accounts, 
    bscProvider, 
    celoProvider,
    getWeb3Instance,
    waitForTransaction } = getProviders();

  const P_KEY_DEPLOYER = str(process.env.PRIVATE_KEY);
  const P_KEY_USER = str(process.env.PRIVATE_KEY_USER);

  const { web3_celo, web3_bsc } = getWeb3Instance();

  const account_celo = accounts(web3_celo, P_KEY_DEPLOYER, P_KEY_USER);
  // const account_bsc = accounts(web3_bsc, P_KEY_DEPLOYER, P_KEY_USER);

  // Set the max request to any amount not greater than type(uint16).max i.e 65536 - 1
  const MAX_REQUEST = 1000;

  // Set cooldown period
  const COOLDOWN = 0;

  const ZERO_ADDRESS = `0x${"0".repeat(40)}`;

  // Amount to bridge
  const BRIDGE_AMOUNT = '500000000000000000000';

  /** Event signature : hash of 'Transfer(address,address,uint256)' i.e Web3.utils.keccak256('Transfer(address,address,uint256)') or
    * ethers.utils.id('Transfer(address,address,uint256)');
  */
  const TRANSFER_EVENT_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  /**Generate wallet instance from private keys on both chains
   * Note: You can always use same account on both chains.
   * To fund with testnet tokens, visit:
   *  https://testnet.celo.org
   *  https://testnet.bnbchain.org/faucet-smart
   */
  const deployer_celo = new ethers.Wallet(P_KEY_DEPLOYER, celoProvider);
  const deployer_bsc = new ethers.Wallet(P_KEY_DEPLOYER, bscProvider);
  const userWalletOnBSC = new ethers.Wallet(P_KEY_USER, bscProvider);
  const userWalletOnCelo = new ethers.Wallet(P_KEY_USER, celoProvider);

  console.log(`
    USER Account: ${userWalletOnCelo.address}
    USER Balances on Celo : ${ethers.utils.parseUnits((await userWalletOnCelo.getBalance()).toString(), 'wei')}}\n
    USER Balances on BSC : ${ethers.utils.parseUnits((await userWalletOnBSC.getBalance()).toString(), 'wei')}}\n
  `);

  console.log(`
    Deploying and signing CeloBridge contract from : ${deployer_celo.address}\n
    $CELO Balances: ${ethers.utils.parseUnits((await deployer_celo.getBalance()).toString(), 'wei')}} 
  `);
  
  // Deploy and Create an instance of the bridge contract on Celo
  var C_bridge = new ethers.ContractFactory(celoBridge.abi, celoBridge.bytecode, deployer_celo); 
  
  // Broadcast trxn to Alfajores, and wait until deployment is completed.
  const c_bridge = await C_bridge.deploy();
  await c_bridge.deployed(); 

  console.log(`Celo_Bridge contract deployed to : ${c_bridge.address}`);
  
  console.log(`
    Deploying and signing BSCBridge contract from : ${deployer_bsc.address}\n
    $BNB Balances: ${ethers.utils.parseUnits((await deployer_bsc.getBalance()).toString(), 'wei')}} 
  `);

   // Deploy and Create an instance of the bridge contract on BSC
  var B_bridge = new ethers.ContractFactory(bscBridge.abi, bscBridge.bytecode, deployer_bsc);
  
  // Broadcast to network and wait until deployment is completed.
  const b_bridge = await B_bridge.deploy();
  await b_bridge.deployed();

  console.log(`Binance_Bridge contract deployed to : ${c_bridge.address}`);
  console.log(`Starting to deploy CelocBGT from : ${deployer_celo.address} ...\n`);

  // Deploy and Create an instance of the token contract on Celo 
  var CToken = new ethers.ContractFactory(cBGT.abi, cBGT.bytecode, deployer_celo);
  const cToken = await CToken.deploy(MAX_REQUEST, COOLDOWN, c_bridge.address);
  await cToken.deployed();
  console.log("cBGT deployed to :", cToken.address);

  console.log(`Starting to deploy BSCbBGT from : ${deployer_bsc.address} ...\n`);

  var BToken = new ethers.ContractFactory(bBGT.abi, bBGT.bytecode, deployer_bsc);
  const bToken = await BToken.deploy(MAX_REQUEST, COOLDOWN, b_bridge.address);
  await bToken.deployed();
  console.log(`bBGT deployed to : ${bToken.address}`);

  // Subscribe to 'Transfer' event using web3 lib
  var eventLogs = web3_celo.eth.subscribe(
    "logs",
    {
      address: cToken.address,
      topics: [TRANSFER_EVENT_SIG],
    },
    async function (error, result) {
      if(!error) {
        console.log("Event Result: ", result);
        if(result.topics.length) {
          const requester = cToken.currentRequester();
          if(requester !== ZERO_ADDRESS) {
            await cToken.bridgeRequests(requester)
            .then(async(request: any) => {
              console.log("Event - requester: ", requester);
              console.log("Event requests: ", request);
              if(request.amount.toString() !== '0') {
                await waitForTransaction(
                  await b_bridge.connect(deployer_bsc).bridgeToken(
                    request.requester,
                    request.amount,
                    request.nonce
                  )
                ).then(async() => {
                  const balance_bsc = (await bToken.balanceOf(userWalletOnBSC.address)).toString();
                  console.log(`User's balance on BSC Network after bridge: ${Web3.utils.fromWei(balance_bsc)}`);
                });
              }
            })
          }
        }
      }
      else console.log('Error: ', error);
    }
  )
    .on("connected", (subId) => {
      console.log(`Sub_Id: ${subId}`);
    })
    .on("data", (log) => {
      console.log("Data log:", log);
      if(log.data.length) {
        console.log("Data 0:", log.data[0]);
      }
    })
    .on("changed", (log) => {
      console.log("ChangeLog: ", log);
    });

  // Update token addresses on both chains
  await c_bridge.connect(deployer_celo).setToken(cToken.address);
  await b_bridge.connect(deployer_bsc).setToken(bToken.address);

  // User claims cBGT on source chain - Celo
  async function requestForcBGT() {
    try {
      await waitForTransaction(await cToken.connect(userWalletOnCelo).requestFreeToken())
      .then(async() => {
        const request = await cToken.tokenRequests(userWalletOnCelo.address);
        const balance = await cToken.balanceOf(userWalletOnCelo.address);
        console.log("Requesters: ", request);
        console.log(
          "User balances before request was fulfilled:",
          Web3.utils.fromWei(balance.toString())
        );
      })
    } catch (error) {
      console.log("Request Error :", error);
    }
  }

  async function approveFundingRequest() {
    try {
      await waitForTransaction(await cToken.connect(deployer_celo).fulfillRequests(userWalletOnCelo.address))
      .then(async() => {
        const request = await cToken.tokenRequests(userWalletOnCelo.address);
        const balance = await cToken.balanceOf(userWalletOnCelo.address);
        console.log("Approved Requesters: ", request);
        console.log(
          "User balances after request is fulfilled:",
          Web3.utils.fromWei(balance.toString())
        );
      })
    } catch (error) {
      console.log("ApproveRequest Error :", error);
    }
  }

  async function transferToBridge() {
    try {
      await waitForTransaction(
        await cToken.connect(userWalletOnCelo).transfer(c_bridge.address, BRIDGE_AMOUNT)
      )
      .then(async() => {
        const balance = await cToken.balanceOf(userWalletOnCelo.address);
        console.log(
          "User balances after transfered to bridge:",
          Web3.utils.fromWei(balance.toString())
        );
      })
    } catch (error) {
      console.log("Transfer to bridge error: ", error);
    }
  }

  await requestForcBGT();
  await approveFundingRequest();
  await transferToBridge();

  await eventLogs.unsubscribe(function(error, result) {
    if(!error) console.log("Error", error);
    else console.log("Result:", result);
  })
  
};
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
