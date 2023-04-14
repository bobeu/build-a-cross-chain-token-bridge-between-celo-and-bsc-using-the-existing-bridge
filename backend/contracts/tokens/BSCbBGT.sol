// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./BaseToken.sol";

contract BSCbBGT is BaseToken {
  constructor(
    uint16 _maxRequest,
    uint8 _coolDownInterval,
    address _bridgeAddress
  ) BaseToken(
    'Binance BGToken', 
    'bBGT', 
    _maxRequest,
    _coolDownInterval,
    msg.sender,
    _bridgeAddress
  ) {}
}