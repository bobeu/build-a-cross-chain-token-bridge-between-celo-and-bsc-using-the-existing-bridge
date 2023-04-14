// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
// import "../interfaces/IBaseToken.sol";

contract BaseToken is ERC20 {
  using SafeMath for uint;
  error Requested();

  struct TokenRequest {
    uint reqAmount;
    uint cooldown;
  }

  struct BridgeRequest {
    address requester;
    uint amount;
    uint nonce;
  }

  address public bridgeAddress;
  address public admin;

  uint public cooldownInterval;

  uint private nonces;

  uint public immutable maxRequest;

  // TokenRequest[] private tokenRequesters;

  address public currentRequester;

  mapping (address => TokenRequest) public tokenRequests;

  mapping (address => BridgeRequest) public bridgeRequests;
  
  mapping (address => uint) public cooldown;

  mapping (uint => bool) private processedNonces;

  constructor(
    string memory name, 
    string memory symbol, 
    uint _maxRequest,
    uint8 _coolDownInterval,
    address _admin,
    address _bridgeAddress
  ) ERC20(name, symbol) {
    require(_admin != address(0) && _bridgeAddress != address(0), "Address is zero");
    admin = _admin;
    cooldownInterval = _coolDownInterval;
    bridgeAddress = _bridgeAddress;
    maxRequest = _maxRequest * (10 ** uint(18));
  }

  modifier onlyBridgeAddress() {
    require(msg.sender == bridgeAddress, "Only bridgeAddress is allowed");
    _;
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, "Only Admin is allowed");
    _;
  }

  function _transfer(
    address from,
    address to,
    uint256 amount
  ) internal override {
    if(to == bridgeAddress) {
      nonces ++;
      uint nonce = nonces;
      bridgeRequests[from] = BridgeRequest(from, amount, nonce);
      currentRequester = from;
      _burn(from, amount);
    } else _transfer(from, to, amount);
  }

  function updatebridgeAddress(address newbridgeAddress) external onlyAdmin {
    bridgeAddress = newbridgeAddress;
  }

  // function getTokenRequesters(address who) public view returns (TokenRequest memory) {
  //   return tokenRequests[who];
  // }
  
  // function burn(address owner, uint amount) external onlyBridgeAddress{
    
  // }

  function mint(address to, uint amount, uint nonce) external onlyBridgeAddress {
    require(!processedNonces[nonce], "Request replay attempt");
    processedNonces[nonce] = true;
    _mint(to, amount);
  }

  function fulfillRequests(address who) public onlyAdmin {
    TokenRequest memory _requesters = tokenRequests[who];
    require(_requesters.reqAmount > 0, "No requests");
    tokenRequests[who] = TokenRequest(0, _now().add(cooldownInterval.mul(1 hours)));
    _mint(who, _requesters.reqAmount);
  }

  function requestFreeToken() public {
    uint amount = maxRequest;
    require(_now() >= tokenRequests[msg.sender].cooldown, "User in cooldown mode");
    tokenRequests[msg.sender] = (TokenRequest(amount, 0));
  }

  function _now() internal view returns(uint) {
    return block.timestamp;
  }
}