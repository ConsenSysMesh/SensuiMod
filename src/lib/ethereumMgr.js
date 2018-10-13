/*
file - ethereumMgr.js - manages interactions with ethereum across the board

resources:
- networks - the various ethereum networks using infura (where key is appended)

- web3 - web3.js is a collection of libraries which allow you to interact with a local
or remote ethereum node, using a HTTP or IPC connection
https://github.com/ethereum/web3.js/

- bluebird - third party promise library
http://bluebirdjs.com/docs/getting-started.html

- eth-signer - A minimal ethereum javascript signer used to sign and send meta tx
https://github.com/ConsenSys/eth-signer

- ethers - This library (which was made for and used by ethers.io) is designed to
make it easier to write client-side JavaScript based wallets, keeping the private
key on the owner’s machine at all times
https://docs.ethers.io/ethers.js/html/api-wallet.html

- pg - node-postgres is a collection of node.js modules for interfacing with your PostgreSQL
database. It has support for callbacks, promises, async/await, connection pooling,
prepared statements, cursors, streaming results, C/C++ bindings, rich type parsing,
and more! Just like PostgreSQL itself there are a lot of features:
this documentation aims to get you up and running quickly and in the right direction.
It also tries to provide guides for more advanced & edge-case topics allowing you to
tap into the full power of PostgreSQL from node.js.
https://node-postgres.com/
*/
import networks from "./networks";
import Web3 from "web3";
import SolidityFunction from "web3/lib/web3/function";
import fs from 'fs';
import ABIJ from '../build/contracts/ComplexStorage.json';
import _ from 'lodash';
import Promise from "bluebird";
//soon to be deprecated, needs to be exchanged - 6/11/2018
import { generators, signers } from "eth-signer";
import Transaction from "ethereumjs-tx";
import { Wallet } from "ethers";
import { Client } from "pg";

/*
from ethsigner library, https://github.com/ConsenSys/eth-signer/blob/master/lib/hd_signer.js
takes in private key, creates simple signer
*/
const HDSigner = signers.HDSigner;

const DEFAULT_GAS_PRICE = 20000000000; // 20 Gwei

class EthereumMgr {
  constructor() {
    this.pgUrl = null;
    this.seed = null;

    this.web3s = {};

    this.gasPrices = {};

    for (const network in networks) {
      let provider = new Web3.providers.HttpProvider(networks[network].rpcUrl);
      let web3 = new Web3(provider);
      web3.eth = Promise.promisifyAll(web3.eth);
      this.web3s[network] = web3;

      this.gasPrices[network] = DEFAULT_GAS_PRICE;
    }
  }

  isSecretsSet() {
    return this.pgUrl !== null || this.seed !== null;
  }

  setSecrets(secrets) {
    this.pgUrl = secrets.PG_URL;
    this.seed = secrets.SEED;
    this.serviceAdd = secrets.PUBLIC_KEY;
    this.contractAdd = secrets.SMART_CONTRACT_ADDRESS;

    const hdPrivKey = generators.Phrase.toHDPrivateKey(this.seed);
    this.signer = new HDSigner(hdPrivKey);
  }

  getProvider(networkName) {
    if (!this.web3s[networkName]) return null;
    return this.web3s[networkName].currentProvider;
  }

  getAddress() {
    return this.signer.getAddress();
  }

  async getBalance(address, networkName) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.web3s[networkName]) throw "no web3 for networkName";
    return await this.web3s[networkName].eth.getBalanceAsync(address);
  }

  async getGasPrice(networkName) {
    if (!networkName) throw "no networkName";
    try {
      this.gasPrices[networkName] = (await this.web3s[
        networkName
      ].eth.getGasPriceAsync()).toNumber();
    } catch (e) {
      console.log(e);
    }
    return this.gasPrices[networkName];
  }

  async estimateGas(tx, from, networkName) {
    if (!tx) throw "no tx object";
    if (!networkName) throw "no networkName";

    //let tx = new Transaction(Buffer.from(txHex, 'hex'))
    let txCopy = {
      nonce: "0x" + (tx.nonce.toString("hex") || 0),
      gasPrice: "0x" + tx.gasPrice.toString("hex"),
      to: "0x" + tx.to.toString("hex"),
      value: "0x" + (tx.value.toString("hex") || 0),
      data: "0x" + tx.data.toString("hex"),
      from
    };
    let price = 3000000;
    try {
      price = await this.web3s[networkName].eth.estimateGasAsync(txCopy);
    } catch (error) {}
    return price;
  }

  async getNonce(address, networkName) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.pgUrl) throw "no pgUrl set";

    console.log("\nMade all input checks, in EthereumMgr. getNonce");

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "INSERT INTO nonces(address,network,nonce) \
             VALUES ($1,$2,0) \
        ON CONFLICT (address,network) DO UPDATE \
              SET nonce = nonces.nonce + 1 \
            WHERE nonces.address=$1 \
              AND nonces.network=$2 \
        RETURNING nonce;",
        [address, networkName]
      );
      console.log(res.rows[0].nonce);
      return res.rows[0].nonce;
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  //makes transaction body to be signed by the sensui service
  async makeTx(dataPayload) {
    //error checks
    if (dataPayload.methodName !== "makeHistoricalReport" || dataPayload.methodName === "makeReport") {
      throw "incorrect methodname being called";
    }

    console.log("\nMade all input checks, in EthereumMgr. makeTx");

    //get ABI and parse through it
    let ABI = JSON.parse(JSON.stringify(ABIJ));
    console.log(ABIJ);
    console.log("\nSuccessfully referenced ABI.");

    //get function signature from smart contract method, hardcoding smart contract method name for now
    //resource: https://bit.ly/2MTxgXy
    //resource: https://github.com/ethereum/web3.js/blob/develop/lib/web3/function.js
    let functionDef = new SolidityFunction('', _.find(ABI, { name: dataPayload.methodName }), '');

    //create data payload for raw transaction
    var payloadData;
    if (dataPayload.methodName === "makeReport") {
      var payloadData = functionDef.toPayload([dataPayload.report, dataPayload.timestamp, dataPayload.reportType, dataPayload.reportUserId]).data;
      console.log('\nGot the data payload ' + payloadData);
    } else if (dataPayload.methodName === "makeHistoricalReport") {
      var payloadData = functionDef.toPayload([dataPayload.report, dataPayload.timeCategory, dataPayload.earliestTimestamp, dataPayload.latestTimestamp, dataPayload.firstId, dataPayload.lastId]).data;
      console.log('\nGot the data payload ' + payloadData);
    }


    //make raw transaction, hard code smart contract address for now 6/23/2018
    //from = funding ethereum Address
    //to = contract address (old contract: 0x693e3857aa48BB2902FD12F724DC095622e61AfC)
    //new contract = TBD 9/29/2018
    let rawTx = {
      from: '0xe2f54E82B8E413537B95e739C2e80d99dE40C67B',
      to: '0x693e3857aa48BB2902FD12F724DC095622e61AfC',
      nonce: await this.getNonce(this.signer.getAddress(), blockchain),
      gasPrice: await this.getGasPrice(blockchain),
      value: "0x00",
      data: payloadData,
    };
    //make formal transaction based on raw transaction
    const tx = new Transaction(rawTx);
    const estimatedGas = await this.estimateGas(
      tx,
      this.signer.getAddress(),
      blockchain
    );
    // add some buffer to the limit
    tx.gasLimit = estimatedGas + 1000;

    return tx;
  }

  async signTx({ tx, blockchain }) {
    //make error checks
    if (!tx) throw "no tx";
    if (!blockchain) throw "no networkName";

    console.log("\nMade all input checks, in EthereumMgr. signTx");

    //take in raw transaction and sign it
    const rawTx = tx.serialize().toString("hex");
    console.log('\n' + "Serialized TX: ");
    console.log(rawTx);
    return new Promise((resolve, reject) => {
      this.signer.signRawTx(rawTx, (error, signedRawTx) => {
        if (error) {
          reject(error);
        }
        resolve(signedRawTx);
      });
    });
  }

  async sendRawTransaction(signedRawTx, networkName) {
    if (!signedRawTx) throw "no signedRawTx";
    if (!networkName) throw "no networkName";

    if (!signedRawTx.startsWith("0x")) {
      console.log("\nsignedRawTx does not start with 0x");
      signedRawTx = "0x" + signedRawTx;
    }

    console.log("\n" + "Getting transaction hash. Using the " + networkName + " network.");
    const txHash = await this.web3s[networkName].eth.sendRawTransactionAsync(
      signedRawTx, function(err, hash) {
        if (!err)
          console.log(hash);
    });
    console.log("\ntxHash: " + txHash);
    let txObj = Wallet.parseTransaction(signedRawTx);
    txObj.gasLimit = txObj.gasLimit.toString(16);
    txObj.gasPrice = txObj.gasPrice.toString();
    txObj.value = txObj.value.toString(16);

    await this.storeTx(txHash, networkName, txObj);

    return txHash;
  }

  async sendTransaction(txObj, networkName) {
    if (!txObj) throw "no txObj";
    if (!networkName) throw "no networkName";

    let tx = new Transaction(txObj);
    const rawTx = tx.serialize().toString("hex");
    let signedRawTx = await this.signTx({
      txHex: rawTx,
      blockchain: networkName
    });
    return await this.sendRawTransaction(signedRawTx, networkName);
  }

  async readNonce(address, networkName) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    console.log("address", address);
    console.log("networkName", networkName);

    try {
      await client.connect();
      const res = await client.query(
        "SELECT nonce \
               FROM nonces \
              WHERE nonces.address=$1 \
                AND nonces.network=$2",
        [address, networkName]
      );
      if (res.rows[0]) {
        return res.rows[0].nonce;
      }
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  async setNonce(address, networkName, nonce) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "UPDATE nonces \
                SET nonce=$3 \
              WHERE nonces.address=$1 \
                AND nonces.network=$2",
        [address, networkName, nonce]
      );
      return res;
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  async getTransactionCount(address, networkName) {
    if (!address) throw "no address";
    if (!networkName) throw "no networkName";
    if (!this.web3s[networkName]) throw "no web3 for networkName";
    return await this.web3s[networkName].eth.getTransactionCountAsync(address);
  }

  async storeTx(txHash, networkName, txObj) {
    if (!txHash) throw "no txHash";
    if (!networkName) throw "no networkName";
    if (!txObj) throw "no txObj";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    //check if the transaction has actually completed
    let txReceipt = this.getTransactionReceipt(txHash, networkName);

    if (txReceipt.status) {
      try {
        await client.connect();
        const res = await client.query(
          "INSERT INTO tx(tx_hash, network,tx_options) \
               VALUES ($1,$2,$3) ",
          [txHash, networkName, txObj]
        );
      } catch (e) {
        throw e;
      } finally {
        await client.end();
      }
    } else {
      throw 'no transaction receipt available';
    }

  }

  async getTransactionReceipt(txHash, networkName) {
    if (!txHash) throw "no txHash";
    if (!networkName) throw "no networkName";
    if (!this.web3s[networkName]) throw "no web3 for networkName";
    const txReceipt = await this.web3s[
      networkName
    ].eth.getTransactionReceiptAsync(txHash);

    await this.updateTx(txHash, networkName, txReceipt);

    return txReceipt;
  }

  async updateTx(txHash, networkName, txReceipt) {
    if (!txHash) throw "no txHash";
    if (!networkName) throw "no networkName";
    if (!txReceipt) throw "no txReceipt";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "UPDATE tx \
                SET tx_receipt = $2, \
                    updated = now() \
              WHERE tx_hash = $1",
        [txHash, txReceipt]
      );
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }

  async getPendingTx(networkName,age){
    if (!networkName) throw "no networkName";
    if (!age) throw "no age";
    if (!this.pgUrl) throw "no pgUrl set";

    const client = new Client({
      connectionString: this.pgUrl
    });

    try {
      await client.connect();
      const res = await client.query(
        "SELECT tx_hash \
           FROM tx \
          WHERE tx_receipt is NULL \
            AND network = $1 \
            AND created > now() - CAST ($2 AS INTERVAL)",
        [networkName, age+' seconds']
      );
      return res;
    } catch (e) {
      throw e;
    } finally {
      await client.end();
    }
  }
}

module.exports = EthereumMgr;
