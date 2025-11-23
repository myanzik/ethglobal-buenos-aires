# Deployment Guide

This guide explains how to deploy the IssueTracker and RewardDistributor contracts.

## Prerequisites

1. Install dependencies:
```bash
pnpm install
```

2. Install OpenZeppelin contracts:
```bash
pnpm add @openzeppelin/contracts
```

3. Compile contracts:
```bash
npx hardhat compile
```

4. Set up your network configuration in `hardhat.config.ts`

5. Set up environment variables (optional):
```bash
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export SEPOLIA_PRIVATE_KEY="your_private_key"
export REWARD_TOKEN_ADDRESS="0x..." # Optional, defaults to test token
```

## Deployment Methods

### Method 1: Using npm/pnpm Scripts (Easiest) ⭐

The easiest way to deploy is using the npm scripts defined in `package.json`:

#### Deploy to Base Sepolia

```bash
# Set environment variables
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export BASE_SEPOLIA_PRIVATE_KEY="your_private_key"

# Deploy using Ignition (recommended)
pnpm deploy:base-sepolia

# Or using the script method
pnpm deploy:base-sepolia:script

# With custom reward token
pnpm deploy:base-sepolia -- --parameters '{"IssueTrackerModule":{"rewardToken":"0xYourTokenAddress"}}'
```

#### Deploy to Ethereum Sepolia

```bash
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
export SEPOLIA_PRIVATE_KEY="your_private_key"

pnpm deploy:sepolia
# Or
pnpm deploy:sepolia:script
```

### Method 2: Using Ignition Directly

Ignition is Hardhat's deployment system that provides better state management and deployment tracking.

#### Deploy to Base Sepolia

```bash
# Set environment variables
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export BASE_SEPOLIA_PRIVATE_KEY="your_private_key"

# Basic deployment (uses default test token)
npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts --network baseSepolia

# With custom reward token address
npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts \
  --network baseSepolia \
  --parameters '{"IssueTrackerModule":{"rewardToken":"0xYourTokenAddress"}}'
```

#### Deploy to Ethereum Sepolia (Alternative)

```bash
npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts --network sepolia
```

#### Deployment Output

After deployment, Ignition will:
- Save deployment artifacts
- Track deployment state
- Allow you to verify deployments
- Enable easy redeployment

The output will show:
```
IssueTracker deployed to: 0x...
RewardDistributor deployed to: 0x...
```

### Method 3: Using Hardhat Script

A simpler script-based deployment:

```bash
# Deploy to Base Sepolia
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export BASE_SEPOLIA_PRIVATE_KEY="your_private_key"

# Basic deployment
npx hardhat run scripts/deploy-issue-tracker.ts --network baseSepolia

# With custom reward token
REWARD_TOKEN_ADDRESS=0x... npx hardhat run scripts/deploy-issue-tracker.ts --network baseSepolia

# With verification
VERIFY=true npx hardhat run scripts/deploy-issue-tracker.ts --network baseSepolia
```

## Available npm Scripts

Run these commands with `pnpm` or `npm`:

- `pnpm compile` - Compile contracts
- `pnpm test` - Run tests
- `pnpm deploy:base-sepolia` - Deploy to Base Sepolia using Ignition
- `pnpm deploy:base-sepolia:script` - Deploy to Base Sepolia using script
- `pnpm deploy:sepolia` - Deploy to Ethereum Sepolia using Ignition
- `pnpm deploy:sepolia:script` - Deploy to Ethereum Sepolia using script
- `pnpm verify:base-sepolia <address> <args...>` - Verify contracts on Base Sepolia
- `pnpm verify:sepolia <address> <args...>` - Verify contracts on Ethereum Sepolia
- `pnpm console:base-sepolia` - Open Hardhat console on Base Sepolia
- `pnpm console:sepolia` - Open Hardhat console on Ethereum Sepolia
- `pnpm node` - Start local Hardhat node

## Deployment Steps

1. **Deploy IssueTracker**
   - Requires: Reward token address (ERC20)
   - Constructor: `IssueTracker(address _rewardToken)`

2. **Deploy RewardDistributor**
   - Requires: IssueTracker address and reward token address
   - Constructor: `RewardDistributor(address _issueTracker, address _rewardToken)`

## Post-Deployment

### 1. Update Chainlink CRE Configuration

Update `chainlink/github-reward/issue-tracker-workflow/config.staging.json`:

```json
{
  "evms": [
    {
      "issueTrackerAddress": "0x...", // Your deployed IssueTracker address
      "chainSelectorName": "base-testnet-sepolia",
      "gasLimit": "500000"
    }
  ]
}
```

Also update `chainlink/github-reward/project.yaml` with Base Sepolia RPC:

```yaml
staging-settings:
  rpcs:
    - chain-name: base-testnet-sepolia
      url: https://sepolia.base.org
      # Or use Alchemy/Infura:
      # url: https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

### 2. Verify Contracts (Optional)

If you deployed to a public network, verify the contracts:

**For Base Sepolia:**
```bash
npx hardhat verify --network baseSepolia \
  <ISSUE_TRACKER_ADDRESS> \
  <REWARD_TOKEN_ADDRESS>

npx hardhat verify --network baseSepolia \
  <REWARD_DISTRIBUTOR_ADDRESS> \
  <ISSUE_TRACKER_ADDRESS> \
  <REWARD_TOKEN_ADDRESS>
```

**For Ethereum Sepolia:**
```bash
npx hardhat verify --network sepolia \
  <ISSUE_TRACKER_ADDRESS> \
  <REWARD_TOKEN_ADDRESS>
```

### 3. Test the Deployment

You can test the contracts using Hardhat console:

```bash
# For Base Sepolia
npx hardhat console --network baseSepolia

# For Ethereum Sepolia
npx hardhat console --network sepolia
```

Then in the console:
```javascript
const IssueTracker = await ethers.getContractFactory("IssueTracker");
const issueTracker = IssueTracker.attach("0x..."); // Your deployed address

// Register a test issue
await issueTracker.registerIssue("owner", "repo", 1);

// Check issue
const issue = await issueTracker.getIssue(issueId);
console.log(issue);
```

## Network Configuration

Make sure your `hardhat.config.ts` has the network configured:

```typescript
networks: {
  baseSepolia: {
    type: "http",
    chainType: "l2",
    url: configVariable("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
    accounts: [configVariable("BASE_SEPOLIA_PRIVATE_KEY")],
    chainId: 84532,
  },
  sepolia: {
    type: "http",
    chainType: "l1",
    url: configVariable("SEPOLIA_RPC_URL"),
    accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
  },
}
```

### Base Sepolia Network Details

- **Chain ID**: 84532
- **RPC URL**: `https://sepolia.base.org` (public) or use Alchemy/Infura
- **Block Explorer**: https://sepolia.basescan.org
- **Chain Selector (Chainlink)**: `base-testnet-sepolia`
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet (Base Sepolia uses ETH)

### Getting Base Sepolia ETH

1. Get Sepolia ETH from a faucet
2. Bridge to Base Sepolia using: https://bridge.base.org
3. Or use the Base Sepolia faucet if available

## Troubleshooting

### "Insufficient funds"
- Make sure your account has enough ETH for gas fees

### "Contract not found"
- Run `npx hardhat compile` first

### "Invalid token address"
- Ensure the reward token address is a valid ERC20 contract
- For testing, you can use the default test token address

### "Network not found"
- Check your `hardhat.config.ts` network configuration
- Ensure RPC URL and private key are set correctly

## Deployment Addresses

After deployment, save these addresses:

- **IssueTracker**: `0x...`
- **RewardDistributor**: `0x...`
- **Reward Token**: `0x...`
- **Network**: Sepolia (or your chosen network)
- **Deployment Transaction**: `0x...`

These will be needed for:
- Chainlink CRE workflow configuration
- Frontend integration
- Testing and verification

