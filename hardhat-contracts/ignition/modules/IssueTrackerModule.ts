import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for IssueTracker and RewardDistributor contracts
 * 
 * Default reward token: USDC on Base Sepolia (0xAF33ADd7918F685B2A82C1077bd8c07d220FFA04)
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts --network baseSepolia
 * 
 * To use a different reward token:
 *   npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts --network baseSepolia --parameters '{"IssueTrackerModule":{"rewardToken":"0x..."}}'
 */
export default buildModule("IssueTrackerModule", (m) => {
  // Get reward token address from parameters or use USDC on Base Sepolia as default
  // USDC token address on Base Sepolia: 0xAF33ADd7918F685B2A82C1077bd8c07d220FFA04
  // You can override this via --parameters flag
  const rewardToken = m.getParameter("rewardToken", "0x036CbD53842c5426634e7929541eC2318f3dCF7e");

  // Deploy IssueTracker contract
  // Requires: rewardToken address (ERC20 token for rewards)
  const issueTracker = m.contract("IssueTracker", [rewardToken], {
    id: "IssueTracker",
  });

  // Deploy RewardDistributor contract
  // Requires: issueTracker address and rewardToken address
  const rewardDistributor = m.contract("RewardDistributor", [
    issueTracker,
    rewardToken,
  ], {
    id: "RewardDistributor",
  });

  return {
    issueTracker,
    rewardDistributor,
  };
});

