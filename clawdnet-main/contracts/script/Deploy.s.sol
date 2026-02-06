// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

/// @title DeployScript
/// @notice Deploy ERC-8004 registries for ClawdNet
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Identity Registry
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));
        
        vm.stopBroadcast();
        
        // Log deployment info for updating frontend
        console.log("\n=== Deployment Summary ===");
        console.log("Chain ID:", block.chainid);
        console.log("Identity Registry:", address(identityRegistry));
        console.log("\nUpdate REGISTRY_ADDRESSES in erc8004-onchain.ts with:");
        console.log("  identity:", address(identityRegistry));
    }
}
