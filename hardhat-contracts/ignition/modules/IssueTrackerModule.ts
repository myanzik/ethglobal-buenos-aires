import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for IssueTracker and RewardDistributor contracts
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts --network sepolia
 * 
 * To pass reward token address:
 *   npx hardhat ignition deploy ignition/modules/IssueTrackerModule.ts --network sepolia --parameters '{"IssueTrackerModule":{"rewardToken":"0x..."}}'
 */
export default buildModule("IssueTrackerModule", (m) => {
  // Get reward token address from parameters or use a default
  // You can pass this via --parameters flag or set a default for testing
  const rewardToken = m.getParameter("rewardToken", "0x4700A50d858Cb281847ca4Ee0938F80DEfB3F1dd");

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

