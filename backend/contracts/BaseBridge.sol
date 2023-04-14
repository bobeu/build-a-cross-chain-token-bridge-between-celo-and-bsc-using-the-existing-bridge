// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import "./tokens/BaseToken.sol";

contract BaseBridge {
  event Burn(address from, uint amount, uint nonce);

  BaseToken private token;

  uint private genNonce;

  address public admin;

  // struct BridgeRequest {
    
  // }

  // mapping(address => mapping(uint => mapping (uint => bool))) public mappedNonces;

  modifier onlyAdmin() {
    require(msg.sender == admin,"Not an admin");
    _;
  }

  constructor() {
    admin = msg.sender;
  }

  function setToken(address baseToken) public onlyAdmin {
    require(address(baseToken) != address(0), "BaseToken is zero address");
    token = BaseToken(baseToken);
  }

  // function approveRequestToBridge(address who, uint amount) public onlyAdmin {
  //   uint _nonce = genNonce;
  //   require(!mappedNonces[who][_nonce], "Already approved");
  //   mappedNonces[who][_nonce] = true;
  // }

  function bridgeToken(address to, uint amount, uint nonce) external onlyAdmin {
    // address currentRequester = token.currentRequester();
    // if(currentRequester != address(0)) {
    //   (
    //     ,
    //     uint amount,
    //     uint nonce
    //   ) = token.bridgeRequests(currentRequester);
      // bytes32 message = prefixed(keccak256(abi.encodePacked( _from, _to, _amount, nonce )));, bytes calldata signature 
      // if(recoverSigner(message, signature) != _from) revert WrongSignature();
      // require(mappedNonces[msg.sender][nonce] == true, 'BaseBridge: Invalid nonce');
      // mappedNonces[msg.sender][nonce] == false;
      // require(amount > 0, "Invalid request");
    token.mint(to, amount, nonce);
    // }

    // emit Transfer( address(token), _to, _amount, nonce);
  }

  // function bridgeToken(uint amount) external {
  //   genNonce ++;
  //   uint nonce = genNonce;
  //   // require(addressToNonces[msg.sender][nonce] == false, 'transfer already processed');
  //   // addressToNonces[msg.sender][nonce] = true;
  //   token.burn(msg.sender, amount);
  //   emit Burn(msg.sender, amount, nonce);
  // }

  // function getBalanceOf(address who) public view returns(uint) {
  //   return token.balanceOf(who);
  // }
  
  // function prefixed(bytes32 hash) internal pure returns (bytes32) {
  //   return keccak256(abi.encodePacked(
  //     '\x19Ethereum Signed Message:\n32',
  //     hash
  //   ));
  // }

  // function recoverSigner(bytes32 message, bytes memory sig)internal pure returns (address){
  //   uint8 v;
  //   bytes32 r;
  //   bytes32 s;
  //   (v, r, s) = splitSignature(sig);
  //   return ecrecover(message, v, r, s);
  // }

  // function splitSignature(bytes memory sig) internal pure returns (uint8, bytes32, bytes32) {
  //   require(sig.length == 65);
  //   bytes32 r;
  //   bytes32 s;
  //   uint8 v;
  //   assembly {
  //     // first 32 bytes, after the length prefix
  //     r := mload(add(sig, 32))
  //     // second 32 bytes
  //     s := mload(add(sig, 64))
  //     // final byte (first byte of the next 32 bytes)
  //     v := byte(0, mload(add(sig, 96)))
  //   }
  //   return (v, r, s);
  // }
}