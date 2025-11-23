import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Script to verify deployed contracts on Base Sepolia
 * 
 * Usage:
 *   npx hardhat run scripts/verify-contracts.ts --network baseSepolia
 * 
 * Or set addresses as environment variables:
 *   ISSUE_TRACKER_ADDRESS=0x... REWARD_DISTRIBUTOR_ADDRESS=0x... npx hardhat run scripts/verify-contracts.ts --network baseSepolia
 */
async function main() {
  // Get deployed addresses from environment or use defaults from deployment
  const issueTrackerAddress = process.env.ISSUE_TRACKER_ADDRESS || "0x5A75957CA230a2089e977553B92eF5D91Ea97Cd8";
  const rewardDistributorAddress = process.env.REWARD_DISTRIBUTOR_ADDRESS || "0x8E8882870dbcEc2C0813B255DA1A706fd5f09119";
  const rewardTokenAddress = process.env.REWARD_TOKEN_ADDRESS || "0xAF33ADd7918F685B2A82C1077bd8c07d220FFA04"; // USDC on Base Sepolia

  console.log("Verifying contracts on Base Sepolia...\n");
  console.log("IssueTracker:", issueTrackerAddress);
  console.log("RewardDistributor:", rewardDistributorAddress);
  console.log("Reward Token (USDC):", rewardTokenAddress);
  console.log("\n");

  const network = process.env.HARDHAT_NETWORK || "baseSepolia";

  try {
    // Verify IssueTracker
    console.log("1. Verifying IssueTracker...");
    try {
      await execAsync(
        `npx hardhat verify --network ${network} ${issueTrackerAddress} ${rewardTokenAddress}`
      );
      console.log(`   ✓ IssueTracker verified: https://sepolia.basescan.org/address/${issueTrackerAddress}\n`);
    } catch (error: any) {
      if (error.stdout?.includes("Already Verified") || error.stderr?.includes("Already Verified")) {
        console.log(`   ✓ IssueTracker already verified: https://sepolia.basescan.org/address/${issueTrackerAddress}\n`);
      } else {
        console.error(`   ✗ IssueTracker verification failed: ${error.message}`);
        throw error;
      }
    }

    // Verify RewardDistributor
    console.log("2. Verifying RewardDistributor...");
    try {
      await execAsync(
        `npx hardhat verify --network ${network} ${rewardDistributorAddress} ${issueTrackerAddress} ${rewardTokenAddress}`
      );
      console.log(`   ✓ RewardDistributor verified: https://sepolia.basescan.org/address/${rewardDistributorAddress}\n`);
    } catch (error: any) {
      if (error.stdout?.includes("Already Verified") || error.stderr?.includes("Already Verified")) {
        console.log(`   ✓ RewardDistributor already verified: https://sepolia.basescan.org/address/${rewardDistributorAddress}\n`);
      } else {
        console.error(`   ✗ RewardDistributor verification failed: ${error.message}`);
        throw error;
      }
    }

    console.log("✅ All contracts verified successfully!");
    console.log("\nContract Links:");
    console.log(`IssueTracker: https://sepolia.basescan.org/address/${issueTrackerAddress}`);
    console.log(`RewardDistributor: https://sepolia.basescan.org/address/${rewardDistributorAddress}`);
  } catch (error: any) {
    console.error("❌ Verification failed:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

