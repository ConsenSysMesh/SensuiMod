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

	//state variables
	uint public numReports; //total number of reports hashed
	mapping (uint => Report) public reports; //hash of report is id --> report struct
	struct Report {
		bytes32 reportHash;
		uint32 reportTimestamp;
		uint8 lat;
		uint8 lng;
	}

	//constructor
	constructor() public {
		//set numReports
		numReports = 0;
	}

	//events
	event ReportMade (bytes32 _reportHash, uint32 _reportTimestamp);

	//functions
		//make a report (only by owner, which makes sense because all api calls will use owner address)
		function makeReport(string report, uint32 timestamp, uint8 latitude, uint8 longitude) public onlyOwner returns (bool) {
			//incrementing Account
			numReports += 1;
			//hash report
			bytes32 reportHashed = sha256(report);
			//adding new report to reports
			reports[numReports].reportHash = reportHashed; //should be hashed before entering mapping?
			reports[numReports].reportTimestamp = timestamp;
			reports[numReports].lat = latitude;
			reports[numReports].lng = longitude;
			//emit event
			emit ReportMade(reports[numReports].reportHash, reports[numReports].reportTimestamp);
			return true;
		}


		//query for number of reports
		function getNumReports() view public returns (uint) {
				//return
			 return numReports;
		}

	//fallback
	function() payable public { }
}
