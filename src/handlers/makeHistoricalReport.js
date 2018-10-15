/*
method: makeReport
needed parameters in url endpoint:
  - string reportsHash,
  - string timecategory,
  - uint256 earliestTimestamp,
  - uint256 lastestTimestamp,
  - uint256 firstId,
  - uint256 lastId

activates makeHistoricalReportHandler, which takes the following inputs (which are instatited
at the top of the file):
  - authMgr*
  - ethereumMgr

Purpose: this activates the handle method in handlers/makeHistoricalReport.js, which verifies creates meta transaction, signs it, and send it to the smart contract function to be committed to the blockchain. The function also pays for the transaction (for groups of report data that have occurred in the past)
*/
class MakeHistoricalReportHandler {
  constructor(ethereumMgr) {
    this.ethereumMgr = ethereumMgr;
  }

  async handle(event, context, cb) {

    /*
    let authToken;
    try {
      authToken = await this.authMgr.verifyNisaba(event);
    } catch (err) {
      console.log("Error on this.authMgr.verifyNisaba");
      console.log(err);
      cb({ code: 401, message: err.message });
      return;
    }
    */

    let body;

    if (event && !event.body) {
      body = event;
    } else if (event && event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        cb({ code: 400, message: "no json body" });
        return;
      }
    } else {
      cb({ code: 400, message: "no json body" });
      return;
    }

    /* checking for inputs */
    if (!body.report) {
      cb({ code: 400, message: "report parameter missing" });
      return;
    }
    if (!body.timeCategory) {
      cb({ code: 400, message: "time category parameter missing" });
      return;
    }
    if (!body.reportUrl) {
      cb({ code: 400, message: "report Url hash parameter missing" });
      return;
    }
    if (!body.reportKeyHash) {
      cb({ code: 400, message: "report key hash parameter missing" });
      return;
    }
    if (!body.reportKeyRevealed) {
      cb({ code: 400, message: "report key revealed parameter missing" });
      return;
    }
    if (!body.blockchain) {
      cb({ code: 400, message: "blockchain parameter missing" });
      return;
    } else if (body.blockchain.toLowerCase() != 'rinkeby' && body.blockchain.toLowerCase() != 'mainnet' && body.blockchain.toLowerCase() != 'kovan' && body.blockchain.toLowerCase() != 'ropsten') {
      cb({ code: 400, message: "blockchain parameter not valid" });
      return;
    }

    //get transaction made
    console.log('Building rawtx');
    let rawTx;
    try {
      rawTx = await this.ethereumMgr.makeTx({
        report: body.report,
        timeCategory: body.timeCategory,
        reportUrl: body.reportUrl,
        reportKeyHash: body.reportKeyHash,
        reportKeyRevealed: body.reportKeyRevealed,
        blockchain: body.blockchain.toLowerCase(),
        methodName: 'makeHistoricalReport',
      });
    } catch (err) {
      console.log("Error on this.ethereumMgr.makeTx");
      console.log(err);
      cb({ code: 500, message: err.message + " Originating from makeHistoricalReport.js calling makeTx from ethereumMgr.js."});
      return;
    }

    //get rawTx signed
    console.log("Getting rawtx signed");
    console.log(body.blockchain.toLowerCase());
    let signedRawTx;
    try {
      signedRawTx = await this.ethereumMgr.signTx({
        tx: rawTx,
        blockchain: body.blockchain.toLowerCase(),
      });
    } catch (err) {
      console.log("Error on this.ethereumMgr.signTx");
      console.log(err);
      cb({ code: 500, message: "Sign Raw Tx Error: " + err.message });
      return;
    }

    //sets transaction hash from created and sent signed transaction - CHANGE
    let txHash;
    try {
      txHash = await this.ethereumMgr.sendRawTransaction(
        signedRawTx,
        body.blockchain.toLowerCase(),
      );
      cb(null, txHash);
    } catch (err) {
      console.log("Error on this.ethereumMgr.sendRawTransaction");
      console.log(err);
      cb({ code: 500, message: "Send Raw Tx Error: " +  err.message });
      return;
    }

  }
}
module.exports = MakeHistoricalReportHandler;
