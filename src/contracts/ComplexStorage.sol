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
	uint public numCurrentReports; //total number of reports hashed
	mapping (bytes32 => Report) public incomingReports; //hash of report is report hash --> report struct
	struct Report {
		bytes32 reportHash; //hash of event data
		uint32 reportTimestamp; //timestamp of event data
    string reportType; //type of event (iot, human reported, etc)
    uint32 reportUserId; //id of iot device of user that reported event
    uint32 reportNum; //report id in the smart contract
    bool exists;
	}

  //state variables for historical events Hala Systems has already recorded
  uint public numHistoricalReports; //total number of reports hashed
  mapping (bytes32 => HistoricalReport) public historicalReports; //hash of report is report hash --> report struct
  struct HistoricalReport {
    bytes32 historyHash; //hash of all report data during a specified time period (ex: week)
    uint32 startTime; //earliest time period of earliest report timestamp in list of hashed reports
    uint32 endTime; //latest time period of earliest report timestamp in list of hashed reports
    uint32 firstReportId; //lowest databse report id in hashed list of reports
    uint32 lastReportId; //highest databse report id in hashed list of reports
    string timeCategory; //weekly, monthly, yearly
    string reportNum;
    bool exists;
  }

	//constructor
	constructor() public {
		//set numReports
		numCurrentReports = 0;
    numHistoricalReports = 0;
	}

	//events
	event ReportMade (bytes32 _reportHash, uint32 _reportTimestamp, uint32 _reportUserId);
  event HistoricalReportMade (bytes32 _reportHash, string _timeCategory);
  event GetReport (bytes32 _reportHash, address _inquirer);

	//functions
		//make a report (only by owner, which makes sense because all api calls will use owner address)
		function makeReport(string report, uint32 timestamp, string type, uint32 userId) public onlyOwner returns (bool) {
			//incrementing Account
			numCurrentReports += 1;
			//hash report
			bytes32 reportHashed = sha256(report);
			//adding new report to reports
			incomingReports[reportHashed].reportHash = reportHashed; //should be hashed before entering mapping?
			incomingReports[reportHashed].reportTimestamp = timestamp;
      incomingReports[reportHashed].reportUserId = userId;
      incomingReports[reportHashed].reportType = type;
      incomingReports[reportHashed].reportNum = numReports;
			//emit event
			emit ReportMade(incomingReports[reportHashed].reportHash, incomingReports[reportHashed].reportTimestamp, incomingReports[reportHashed].reportUserId);
			return true;
		}

    //make historical report (only by owner, which makes sense because all api calls will use owner address)
		function makeHistoricalReport(string reports, string timecategory, uint32 earliestTimestamp, uint32 lastestTimestamp, uint32 firstId, uint32 lastId) public onlyOwner returns (bool) {
			//incrementing Account
			numHistoricalReports += 1;
			//hash report
			bytes32 reportsHashed = sha256(reports);
			//adding new report to reports
      //should be hashed before entering mapping?
			historicalReports[reportsHashed].historyHash = reportsHashed;
			historicalReports[reportsHashed].startTime = earliestTimestamp;
      historicalReports[reportsHashed].endTime = lastestTimestamp;
      historicalReports[reportsHashed].timeCategory = timecategory;
      historicalReports[reportsHashed].firstReportId = firstId;
      historicalReports[reportsHashed].lastReportId = lastId;
      historicalReports[reportsHashed].reportNum = numHistoricalReports;
			//emit event
			emit HistoricalReportMade(historicalReports[reportsHashed].reportHash, historicalReports[reportsHashed].timeCategory);
			return true;
		}

    //query for report existence
    function getReportExistence(bytes32 reportHash, string reportType) public view returns (bool) {
      if (reportType === "HISTORIC") {
        if (historicalReports[reportHash].exists) {
          GetReport(reportHash, msg.sender);
          return true;
        }
      } else if (reportType === "INDIVIDUAL") {
        if (incomingReports[reportHash].exists) {
          GetReport(reportHash, msg.sender);
          return true;
        }
      }

      return false;
    }

		//query for number of reports
		function getNumReports(string reportType) public view returns (uint numReports) {
      if (reportType === "HISTORIC") {
        return numCurrentReports;
      } else if (reportType === "INDIVIDUAL") {
        return numHistoricalReports;
      }
			 return 0;
		}

	//fallback
	function() payable public { }
}
