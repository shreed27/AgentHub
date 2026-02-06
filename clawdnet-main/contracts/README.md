# ClawdNet ERC-8004 Contracts

ERC-8004 Identity and Reputation Registry contracts for ClawdNet agents.

## Overview

This package contains Solidity contracts implementing the ERC-8004 (Trustless Agents) standard for on-chain agent identity management.

## Contracts

- **IdentityRegistry.sol** - Agent registration and identity management
- **(Coming soon) ReputationRegistry.sol** - Feedback and reputation tracking
- **(Coming soon) ValidationRegistry.sol** - Work validation with time bounds

## Setup

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:
```bash
forge install
```

3. Build contracts:
```bash
forge build
```

4. Run tests:
```bash
forge test
```

## Deployment

### Environment Setup

Create a `.env` file:
```bash
PRIVATE_KEY=your_deployer_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

### Deploy to Base Sepolia (Testnet)

```bash
source .env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

### Deploy to Base Mainnet

```bash
source .env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify
```

## After Deployment

Update the registry addresses in `apps/web/src/lib/erc8004-onchain.ts`:

```typescript
export const REGISTRY_ADDRESSES = {
  [baseSepolia.id]: {
    identity: '0x...' as Address, // Your deployed address
    reputation: null,
    validation: null,
  },
  [base.id]: {
    identity: '0x...' as Address, // Your deployed address
    reputation: null,
    validation: null,
  },
};
```

## Contract Addresses

| Chain | Identity Registry | Reputation Registry | Validation Registry |
|-------|-------------------|---------------------|---------------------|
| Base Sepolia (84532) | TBD | TBD | TBD |
| Base Mainnet (8453) | TBD | TBD | TBD |

## License

MIT
