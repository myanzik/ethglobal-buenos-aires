import { ethers } from "hardhat";

/**
 * Simple deployment script using Hardhat's ethers
 * Alternative to Ignition if you prefer a more traditional approach
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-issue-tracker.ts --network sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Get reward token address from environment or use default
  const rewardTokenAddress = process.env.REWARD_TOKEN_ADDRESS || "0x4700A50d858Cb281847ca4Ee0938F80DEfB3F1dd";
  
  console.log("\n1. Deploying IssueTracker...");
  console.log("   Reward Token:", rewardTokenAddress);
  
  const IssueTracker = await ethers.getContractFactory("IssueTracker");
  const issueTracker = await IssueTracker.deploy(rewardTokenAddress);
  await issueTracker.waitForDeployment();
  const issueTrackerAddress = await issueTracker.getAddress();
  
  console.log("   IssueTracker deployed to:", issueTrackerAddress);

  console.log("\n2. Deploying RewardDistributor...");
  console.log("   IssueTracker:", issueTrackerAddress);
  console.log("   Reward Token:", rewardTokenAddress);
  
  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(
    issueTrackerAddress,
    rewardTokenAddress
  );
  await rewardDistributor.waitForDeployment();
  const rewardDistributorAddress = await rewardDistributor.getAddress();
  
  console.log("   RewardDistributor deployed to:", rewardDistributorAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("IssueTracker:", issueTrackerAddress);
  console.log("RewardDistributor:", rewardDistributorAddress);
  console.log("Reward Token:", rewardTokenAddress);
  console.log("\nSave these addresses for your Chainlink CRE workflow configuration!");

  // Verify contracts if on a public network
  if (process.env.VERIFY === "true") {
    console.log("\n3. Verifying contracts...");
    try {
      await hre.run("verify:verify", {
        address: issueTrackerAddress,
        constructorArguments: [rewardTokenAddress],
      });
      console.log("   IssueTracker verified");
      
      await hre.run("verify:verify", {
        address: rewardDistributorAddress,
        constructorArguments: [issueTrackerAddress, rewardTokenAddress],
      });
      console.log("   RewardDistributor verified");
    } catch (error) {
      console.log("   Verification failed:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

