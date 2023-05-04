// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../contracts/GovernanceToken.sol";

contract GovernanceTokenDeployer is Test {
    function setUp() public {}

    function testDeploy() public {
        console.log("Deploying GovernanceToken");

        address alice = vm.addr(1);
        bytes32 hash = keccak256('Signed by Alice');

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, hash);

        console.log("v, r, s:");
        console.log(v);
        console.logBytes32(r);
        console.logBytes32(s);


        address signer = ecrecover(hash, v, r, s);
        assertEq(signer, alice);

        console.log("Deployer address: ", address(this));
    }
}