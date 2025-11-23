#!/bin/bash

# Script to verify contracts on Base Sepolia
# Usage: ./scripts/verify-contracts.sh

# Default addresses (update these after deployment)
ISSUE_TRACKER_ADDRESS="${ISSUE_TRACKER_ADDRESS:-0x5A75957CA230a2089e977553B92eF5D91Ea97Cd8}"
REWARD_DISTRIBUTOR_ADDRESS="${REWARD_DISTRIBUTOR_ADDRESS:-0x8E8882870dbcEc2C0813B255DA1A706fd5f09119}"
REWARD_TOKEN_ADDRESS="${REWARD_TOKEN_ADDRESS:-0xAF33ADd7918F685B2A82C1077bd8c07d220FFA04}"

echo "Verifying contracts on Base Sepolia..."
echo "IssueTracker: $ISSUE_TRACKER_ADDRESS"
echo "RewardDistributor: $REWARD_DISTRIBUTOR_ADDRESS"
echo "Reward Token (USDC): $REWARD_TOKEN_ADDRESS"
echo ""

# Verify IssueTracker
echo "1. Verifying IssueTracker..."
npx hardhat verify --network baseSepolia \
  "$ISSUE_TRACKER_ADDRESS" \
  "$REWARD_TOKEN_ADDRESS"

if [ $? -eq 0 ]; then
  echo "✓ IssueTracker verified: https://sepolia.basescan.org/address/$ISSUE_TRACKER_ADDRESS"
else
  echo "⚠️  IssueTracker verification failed or already verified"
fi

echo ""

# Verify RewardDistributor
echo "2. Verifying RewardDistributor..."
npx hardhat verify --network baseSepolia \
  "$REWARD_DISTRIBUTOR_ADDRESS" \
  "$ISSUE_TRACKER_ADDRESS" \
  "$REWARD_TOKEN_ADDRESS"

if [ $? -eq 0 ]; then
  echo "✓ RewardDistributor verified: https://sepolia.basescan.org/address/$REWARD_DISTRIBUTOR_ADDRESS"
else
  echo "⚠️  RewardDistributor verification failed or already verified"
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "Contract Links:"
echo "IssueTracker: https://sepolia.basescan.org/address/$ISSUE_TRACKER_ADDRESS"
echo "RewardDistributor: https://sepolia.basescan.org/address/$REWARD_DISTRIBUTOR_ADDRESS"

