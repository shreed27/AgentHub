// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title IIdentityRegistry
/// @notice Interface for the Identity Registry contract as defined in ERC-8004 (draft)
interface IIdentityRegistry {
    /// @notice Struct representing an agent
    struct Agent {
        string domain;
        address addr;
    }

    /// @notice Emitted when a new agent is registered
    event AgentRegistered(uint256 indexed agentId, string indexed agentDomain, address indexed agentAddress);

    /// @notice Emitted when an agent is updated
    event AgentUpdated(
        uint256 indexed agentId,
        string previousAgentDomain,
        string indexed newAgentDomain,
        address previousAgentAddress,
        address indexed newAgentAddress
    );

    /// @notice Thrown when the caller is not authorized
    error Unauthorized(address caller, address expected);

    /// @notice Thrown when the domain is invalid
    error InvalidDomain();

    /// @notice Thrown when the address is invalid
    error InvalidAddress();

    /// @notice Thrown when domain is already registered
    error DomainAlreadyRegistered(string domain);

    /// @notice Thrown when address is already registered
    error AddressAlreadyRegistered(address agentAddress);

    /// @notice Thrown when agent is not found
    error AgentNotFound(uint256 agentId);

    /// @notice Register a new agent
    function newAgent(string calldata agentDomain, address agentAddress) external returns (uint256 agentId);

    /// @notice Update an existing agent
    function updateAgent(uint256 agentId, string calldata newAgentDomain, address newAgentAddress) external returns (bool success);

    /// @notice Get agent by ID
    function getAgent(uint256 agentId) external view returns (uint256 agentId_, string memory agentDomain_, address agentAddress_);

    /// @notice Resolve agent by domain
    function resolveAgentByDomain(string calldata agentDomain) external view returns (uint256 agentId_, string memory agentDomain_, address agentAddress_);

    /// @notice Resolve agent by address
    function resolveAgentByAddress(address agentAddress) external view returns (uint256 agentId_, string memory agentDomain_, address agentAddress_);
}
