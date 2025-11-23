# Contract Verification Guide

This guide explains how to verify your deployed contracts on BaseScan (Base Sepolia block explorer).

## Quick Verification

### Using npm/pnpm Script (Easiest) ⭐

```bash
# Verify all contracts at once (uses default deployed addresses)
pnpm verify:base-sepolia:all

# Or verify individually
pnpm verify:issue-tracker
pnpm verify:reward-distributor
```

**Note:** The `verify:base-sepolia` script requires address arguments. Use the scripts above or pass arguments manually.

### Using TypeScript Script

```bash
# With default addresses
npx hardhat run scripts/verify-contracts.ts --network baseSepolia

# With custom addresses
ISSUE_TRACKER_ADDRESS=0x... REWARD_DISTRIBUTOR_ADDRESS=0x... \
  npx hardhat run scripts/verify-contracts.ts --network baseSepolia
```

### Using Shell Script

```bash
# Make script executable (first time only)
chmod +x scripts/verify-contracts.sh

# Run verification
./scripts/verify-contracts.sh

# Or with custom addresses
ISSUE_TRACKER_ADDRESS=0x... REWARD_DISTRIBUTOR_ADDRESS=0x... ./scripts/verify-contracts.sh
```

### Manual Verification

```bash
# Verify IssueTracker
pnpm verify:base-sepolia 0x5A75957CA230a2089e977553B92eF5D91Ea97Cd8 0xAF33ADd7918F685B2A82C1077bd8c07d220FFA04

# Verify RewardDistributor
pnpm verify:base-sepolia 0x8E8882870dbcEc2C0813B255DA1A706fd5f09119 0x5A75957CA230a2089e977553B92eF5D91Ea97Cd8 0xAF33ADd7918F685B2A82C1077bd8c07d220FFA04
```

### Generate Standard JSON for Manual Verification

If automatic verification fails, you can generate Standard JSON Input files for manual verification:

```bash
# Generate standard JSON files from build-info
pnpm generate:standard-json
```

This will create Standard JSON files in `scripts/standard-json/`:
- `IssueTracker.json`
- `RewardDistributor.json`

**How to use Standard JSON files:**

1. **BaseScan (Base Sepolia)**:
   - Go to: https://sepolia.basescan.org/verifyContract
   - Enter your contract address
   - Select "Via Standard JSON Input"
   - Upload the corresponding JSON file (e.g., `IssueTracker.json`)
   - Enter constructor arguments
   - Submit for verification

2. **Blockscout (Base Sepolia)**:
   - Go to: https://base-sepolia.blockscout.com/contracts/verify
   - Enter your contract address
   - Select "Standard JSON Input"
   - Upload the JSON file
   - Enter constructor arguments
   - Submit

3. **Sourcify**:
   - Go to: https://sourcify.dev/
   - Select your network (Base Sepolia)
   - Enter contract address
   - Upload the Standard JSON file
   - Submit

## Current Deployed Addresses

Based on your latest deployment:

- **IssueTracker**: `0x5A75957CA230a2089e977553B92eF5D91Ea97Cd8`
- **RewardDistributor**: `0x8E8882870dbcEc2C0813B255DA1A706fd5f09119`
- **Reward Token (USDC)**: `0xAF33ADd7918F685B2A82C1077bd8c07d220FFA04`

## BaseScan API Key (Optional)

For Base Sepolia, verification works without an API key, but you can optionally set one:

```bash
export BASESCAN_API_KEY="your_api_key_here"
# Or use Etherscan API key
export ETHERSCAN_API_KEY="your_api_key_here"
```

Get a free API key from:
- BaseScan: https://basescan.org/apis
- Etherscan: https://etherscan.io/apis (works for BaseScan too)

## Verification Links

After verification, view your contracts at:

- **IssueTracker**: https://sepolia.basescan.org/address/0x5A75957CA230a2089e977553B92eF5D91Ea97Cd8
- **RewardDistributor**: https://sepolia.basescan.org/address/0x8E8882870dbcEc2C0813B255DA1A706fd5f09119

## Troubleshooting

**"Contract already verified"**
- This is fine! The contract is already verified on the explorer.

**"Verification failed"**
- Make sure the contract addresses are correct
- Ensure constructor arguments match exactly
- Check that contracts were deployed on Base Sepolia (chain ID 84532)

**"API key required"**
- Base Sepolia verification should work without an API key
- If needed, set `BASESCAN_API_KEY` or `ETHERSCAN_API_KEY` environment variable

