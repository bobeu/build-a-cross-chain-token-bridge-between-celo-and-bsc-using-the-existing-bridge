// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./BaseToken.sol";

contract CelocBGT is BaseToken {
  constructor(
    uint16 _maxRequest,
    uint8 _coolDownInterval,
    address _bridgeAddress
  ) BaseToken(
    'Celo BGToken', 
    'cBGT', 
    _maxRequest,
    _coolDownInterval,
    msg.sender,
    _bridgeAddress
  ) {}

  
}