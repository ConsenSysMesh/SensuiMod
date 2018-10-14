pragma solidity ^0.4.23;

contract Ownable {

  address public owner;

  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
 	constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));
    owner = newOwner;
  }

}

contract ComplexStorage is Ownable {
  //there are 2 types of reports
    //Current Reports that store hashes of indidviual events as they come in
    //Historical Reports, that are made of many reports concatenated together and hashed as owner

	//state variables for current events incoming to Hala Systems
	uint256 public numCurrentReports; //total number of reports hashed
	mapping (bytes32 => Report) public incomingReports; //hash of report is report hash --> report struct
	struct Report {
    bytes32 reportHash;
		uint256 reportTimestamp; //timestamp of event data
    string reportType; //type of event (iot, human reported, etc)
    uint256 reportUserId; //id of iot device of user that reported event
    uint256 reportNum; //report id in the smart contract
    string reportURL;
    bytes32 reportKeyHash;
    string reportKeyRevealed;
    bool exists;
	}

  //state variables for historical events Hala Systems has already recorded
  uint256 public numHistoricalReports; //total number of reports hashed
  mapping (bytes32 => HistoricalReport) public historicalReports; //hash of report is report hash
  struct HistoricalReport {
    bytes32 reportHash;
    string timeCategory; //weekly, monthly, yearly
    uint256 reportNum;
    string reportURL;
    bytes32 reportKeyHash;
    string reportKeyRevealed;
    bool exists;
  }


	//constructor
	constructor() public {
		//set numReports
		numCurrentReports = 0;
    numHistoricalReports = 0;
	}

	//events
	event ReportMade (bytes32 _reportHash, uint256 _reportTimestamp, string _reportType, string _reportUrl, bytes32 _reportKeyHash);
  event HistoricalReportMade (bytes32 _reportsHash, string _timeCategory, string _reportUrl, bytes32 _reportKeyHash);
  event GetReport (bytes32 _reportHash, address _inquirer);
  event RevealKey (string _reportKey, address _revealer);

	//functions
		//make a report (only by owner, which makes sense because all api calls will use owner address)
		function makeReport(bytes32 _reportHash, uint256 _timestamp, string _type, uint256 _userId, string _reportUrl, bytes32 _reportKeyHash, string _reportKeyRevealed) public onlyOwner returns (bool) {
			//incrementing Account
			numCurrentReports += 1;
			//adding new report to reports
			incomingReports[_reportHash] = Report(_reportHash, _timestamp, _type, _userId, numCurrentReports, _reportUrl, _reportKeyHash, _reportKeyRevealed, true);

			//emit event
			emit ReportMade(_reportHash, _timestamp, _type, _reportUrl, _reportKeyHash);
			return true;
		}

    //make historical report (only by owner, which makes sense because all api calls will use owner address)
		function makeHistoricalReport(bytes32 _reportsHash, string _timecategory, string _reportURL, bytes32 _reportKeyHash, string _reportKeyRevealed) public onlyOwner returns (bool) {
			//incrementing Account
			numHistoricalReports += 1;
			//adding new report to reports
      //should be hashed before entering mapping?
      historicalReports[_reportsHash] = HistoricalReport(_reportsHash, _timecategory, numHistoricalReports, _reportURL, _reportKeyHash, _reportKeyRevealed, true);

			//emit event
			emit HistoricalReportMade(_reportsHash, _timecategory, _reportURL, _reportKeyHash);
			return true;
		}

    //reveal key
    function revealReportKey(bytes32 _reportHash, string _reportKey) public onlyOwner returns (bool) {
      //find report by hash
      if (incomingReports[_reportHash].exists) {
        incomingReports[_reportHash].reportKeyRevealed = _reportKey;
        emit RevealKey(_reportKey, msg.sender);
        return true;
      }
      return false;
    }

    //reveal history key
    function revealHistoryReportKey(bytes32 _reportHash, string _reportKey) public onlyOwner returns (bool) {
        //find report by hash
        if (historicalReports[_reportHash].exists) {
          historicalReports[_reportHash].reportKeyRevealed = _reportKey;
          emit RevealKey(_reportKey, msg.sender);
          return true;
        }
        return false;
    }

	//fallback
	function() payable public { }
}
