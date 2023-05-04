//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract GovernanceToken is ERC20, Ownable {
    constructor() ERC20("GovernanceToken", "GTK") {
        _mint(msg.sender, 1000000000000000000000000);
    }
}