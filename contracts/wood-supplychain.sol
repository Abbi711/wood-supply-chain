pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

contract Product {
  
  struct Batch {
    uint id;
    uint currlat;
    uint currlon;
    uint timestamp;
    address handler;
    string originRegion;
    string woodType;
    uint stage;
    uint batchPrice;
    uint quantity;
    bool transferAccepted;
  }

  struct Change{
    uint lat;
    uint lon;
    address handler;
  }

  mapping(uint => Batch) public batches;
  mapping(uint => uint[]) public latTrack;
  mapping(uint => uint[]) public lonTrack;
  mapping(uint => address[]) public handlerTrack;
  mapping(address => bool) public handlers;

  uint public nextBatchId;

  address public admin;
  
  constructor() public {
    admin = msg.sender;
  }

  function getBatch(uint id) external view returns(Batch memory) {
    return batches[id];
  }
  
  function addHandler(address _handler) external onlyAdmin() {
    handlers[_handler] = true;
  }

  function createBatch (
    uint _initlat,
    uint _initlon,
    string memory _originRegion,  
    string memory _woodType,
    uint _batchPrice,
    uint _quantity
    ) public {
        require(handlers[msg.sender] == true, 'only handlers can add a batch');
        batches[nextBatchId] = Batch(
        nextBatchId,
        _initlat,
        _initlon,
        now,
        msg.sender, 
        _originRegion,
        _woodType,
        0,
        _batchPrice,
        _quantity,
        true
        );
        
        latTrack[nextBatchId].push(_initlat);
        lonTrack[nextBatchId].push(_initlon);
        handlerTrack[nextBatchId].push(msg.sender);
        nextBatchId++;
  }

  function moveBatch(uint _id, uint _lat, uint _lon, address _newHandler) public {
    require(handlers[msg.sender] == true, 'only handlers can move a batch'); 
    require(handlers[_newHandler] == true, '_newHandler address should be a handler');
    Batch storage _batch = batches[_id];
    require(_batch.handler == msg.sender, 'only batch handler can change its location');
    require(_batch.transferAccepted == true);
    _batch.currlat = _lat;
    _batch.currlon = _lon;
    _batch.stage++;
    _batch.handler = _newHandler;
    _batch.transferAccepted = false;
    latTrack[_id].push(_lat);
    lonTrack[_id].push(_lon);
    handlerTrack[_id].push(_newHandler);
  }  

  function verifyBatch(uint _id) public {
    Batch storage _batch = batches[_id];
    require(_batch.handler == msg.sender, 'only new batch handler can verify its quantity');
    require(_batch.transferAccepted == false);
    _batch.transferAccepted = true ;
  }

  function changeHandler(uint _id, address _newHandler) public {
    require(handlers[msg.sender] == true, 'only handlers can move a batch'); 
    require(handlers[_newHandler] == true, '_newHandler address should be a handler');
    Batch storage _batch = batches[_id];
    require(_batch.handler == msg.sender, 'only batch handler can change its handler');
    require(_batch.transferAccepted == true);
    _batch.stage++;
    _batch.handler = _newHandler;
    _batch.transferAccepted = false;
    latTrack[_id].push(_batch.currlat);
    lonTrack[_id].push(_batch.currlon);
    handlerTrack[_id].push(_newHandler);
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, 'only admin');
    _;
  }
}
