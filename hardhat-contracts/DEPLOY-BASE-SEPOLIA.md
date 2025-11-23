# Quick Guide: Deploy to Base Sepolia

## Prerequisites

1. Get Base Sepolia ETH:
   - Get Sepolia ETH from a faucet
   - Bridge to Base Sepolia: https://bridge.base.org
   - Or use Base Sepolia faucet if available

2. Set environment variables:
```bash
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export BASE_SEPOLIA_PRIVATE_KEY="your_private_key_here"
```

## Quick Deployment

### Using npm/pnpm scripts (Easiest)

```bash
# Deploy with default test token using Ignition
pnpm deploy:base-sepolia

# Or using the script method
pnpm deploy:base-sepolia:script

# Deploy with custom reward token
pnpm deploy:base-sepolia -- --parameters '{"IssueTrackerModule":{"rewardToken":"0xYourTokenAddress"}}'
```

### Using Ignition directly

```bash
# Deploy with default test token
npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts --network baseSepolia

# Deploy with custom reward token
npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts \
  --network baseSepolia \
  --parameters '{"IssueTrackerModule":{"rewardToken":"0xYourTokenAddress"}}'
```

### Using Script directly

```bash
npx hardhat run scripts/deploy-issue-tracker.ts --network baseSepolia
```

## Network Information

- **Network Name**: `baseSepolia`
- **Chain ID**: 84532
- **RPC URL**: `https://sepolia.base.org`
- **Block Explorer**: https://sepolia.basescan.org
- **Chainlink Chain Selector**: `base-testnet-sepolia`

## After Deployment

1. **Save the deployed addresses:**
   - IssueTracker: `0x...`
   - RewardDistributor: `0x...`

2. **Update Chainlink CRE config:**
   - Edit `chainlink/github-reward/issue-tracker-workflow/config.staging.json`
   - Set `issueTrackerAddress` to your deployed address
   - Ensure `chainSelectorName` is `"base-testnet-sepolia"`

3. **Update project.yaml:**
   - Edit `chainlink/github-reward/project.yaml`
   - Add Base Sepolia RPC URL

## Verify Contracts (Optional)

```bash
# Using npm script
pnpm verify:base-sepolia <ISSUE_TRACKER_ADDRESS> <REWARD_TOKEN_ADDRESS>
pnpm verify:base-sepolia <REWARD_DISTRIBUTOR_ADDRESS> <ISSUE_TRACKER_ADDRESS> <REWARD_TOKEN_ADDRESS>

# Or directly
npx hardhat verify --network baseSepolia \
  <ISSUE_TRACKER_ADDRESS> \
  <REWARD_TOKEN_ADDRESS>

npx hardhat verify --network baseSepolia \
  <REWARD_DISTRIBUTOR_ADDRESS> \
  <ISSUE_TRACKER_ADDRESS> \
  <REWARD_TOKEN_ADDRESS>
```

## Troubleshooting

**"Insufficient funds"**
- Make sure you have Base Sepolia ETH (not just Sepolia ETH)
- Bridge Sepolia ETH to Base Sepolia using the official bridge

**"Network not found"**
- Check that `BASE_SEPOLIA_RPC_URL` and `BASE_SEPOLIA_PRIVATE_KEY` are set
- Verify the network name is `baseSepolia` (case-sensitive)

**"Invalid RPC URL"**
- Try using Alchemy or Infura RPC:
  - Alchemy: `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
  - Infura: `https://base-sepolia.infura.io/v3/YOUR_PROJECT_ID`

