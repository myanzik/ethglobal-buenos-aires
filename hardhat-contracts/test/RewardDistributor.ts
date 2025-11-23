import { expect } from "chai";
import { network } from "hardhat";
import { Contract } from "ethers";

const { ethers } = await network.connect();

describe("RewardDistributor", function () {
  let rewardToken: Contract;
  let issueTracker: Contract;
  let rewardDistributor: Contract;
  let owner: any;
  let funder: any;
  let contributor1: any;
  let contributor2: any;
  let other: any;

  const OWNER = "test-owner";
  const REPO = "test-repo";
  const ISSUE_NUMBER = 1n;

    beforeEach(async function () {
      [owner, funder, contributor1, contributor2, other] =
        await ethers.getSigners();

      // Deploy a mock ERC20 token for testing
      const TokenFactory = await ethers.getContractFactory("MockERC20");
      rewardToken = await TokenFactory.deploy();
      await rewardToken.waitForDeployment();

    // Mint tokens to funder for testing
    const mintAmount = ethers.parseEther("1000");
    await rewardToken.mint(funder.address, mintAmount);
    await rewardToken.mint(owner.address, mintAmount);

    // Deploy IssueTracker
    const IssueTrackerFactory = await ethers.getContractFactory("IssueTracker");
    issueTracker = await IssueTrackerFactory.deploy(
      await rewardToken.getAddress()
    );
    await issueTracker.waitForDeployment();

    // Deploy RewardDistributor
    const RewardDistributorFactory = await ethers.getContractFactory(
      "RewardDistributor"
    );
    rewardDistributor = await RewardDistributorFactory.deploy(
      await issueTracker.getAddress(),
      await rewardToken.getAddress()
    );
    await rewardDistributor.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct issue tracker and token addresses", async function () {
      expect(await rewardDistributor.issueTracker()).to.equal(
        await issueTracker.getAddress()
      );
      expect(await rewardDistributor.rewardToken()).to.equal(
        await rewardToken.getAddress()
      );
    });

    it("Should revert with zero address for issue tracker", async function () {
      const RewardDistributorFactory = await ethers.getContractFactory(
        "RewardDistributor"
      );
      await expect(
        RewardDistributorFactory.deploy(
          ethers.ZeroAddress,
          await rewardToken.getAddress()
        )
      ).to.be.revertedWith("Invalid issue tracker address");
    });

    it("Should revert with zero address for reward token", async function () {
      const RewardDistributorFactory = await ethers.getContractFactory(
        "RewardDistributor"
      );
      await expect(
        RewardDistributorFactory.deploy(
          await issueTracker.getAddress(),
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Invalid token address");
    });
  });

  describe("depositFunds", function () {
    it("Should deposit funds and emit FundsDeposited event", async function () {
      const amount = ethers.parseEther("100");
      const issueId = await issueTracker.generateIssueId(
        OWNER,
        REPO,
        ISSUE_NUMBER
      );

      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        amount
      );

      await expect(
        rewardDistributor.connect(funder).depositFunds(issueId, amount)
      )
        .to.emit(rewardDistributor, "FundsDeposited")
        .withArgs(issueId, funder.address, amount);

      expect(await rewardToken.balanceOf(await rewardDistributor.getAddress())).to.equal(amount);
    });

    it("Should revert with zero amount", async function () {
      const issueId = await issueTracker.generateIssueId(
        OWNER,
        REPO,
        ISSUE_NUMBER
      );

      await expect(
        rewardDistributor.connect(funder).depositFunds(issueId, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should transfer tokens from funder to contract", async function () {
      const amount = ethers.parseEther("100");
      const issueId = await issueTracker.generateIssueId(
        OWNER,
        REPO,
        ISSUE_NUMBER
      );

      const funderBalanceBefore = await rewardToken.balanceOf(funder.address);
      const contractBalanceBefore = await rewardToken.balanceOf(
        await rewardDistributor.getAddress()
      );

      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        amount
      );

      await rewardDistributor.connect(funder).depositFunds(issueId, amount);

      expect(await rewardToken.balanceOf(funder.address)).to.equal(
        funderBalanceBefore - amount
      );
      expect(await rewardToken.balanceOf(await rewardDistributor.getAddress())).to.equal(
        contractBalanceBefore + amount
      );
    });
  });

  describe("fundIssue", function () {
    it("Should fund issue and return issue ID", async function () {
      const amount = ethers.parseEther("100");

      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        amount
      );

      const tx = await rewardDistributor
        .connect(funder)
        .fundIssue(OWNER, REPO, ISSUE_NUMBER, amount);
      const receipt = await tx.wait();

      const issueId = await issueTracker.generateIssueId(
        OWNER,
        REPO,
        ISSUE_NUMBER
      );

      await expect(tx)
        .to.emit(rewardDistributor, "FundsDeposited")
        .withArgs(issueId, funder.address, amount);

      expect(await rewardToken.balanceOf(await rewardDistributor.getAddress())).to.equal(amount);
    });

    it("Should revert with zero amount", async function () {
      await expect(
        rewardDistributor
          .connect(funder)
          .fundIssue(OWNER, REPO, ISSUE_NUMBER, 0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("distributeReward", function () {
    let issueId: string;
    const fundingAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      // Register issue
      await issueTracker.connect(owner).registerIssue(OWNER, REPO, ISSUE_NUMBER);
      issueId = await issueTracker.generateIssueId(OWNER, REPO, ISSUE_NUMBER);

      // Add contributors
      await issueTracker.addContributor(issueId, contributor1.address);
      await issueTracker.addContributor(issueId, contributor2.address);

      // Fund the issue
      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        fundingAmount
      );
      await rewardDistributor.connect(funder).depositFunds(issueId, fundingAmount);

      // Record funding in issue tracker (simulating what would happen)
      await issueTracker.recordFunding(issueId, funder.address, fundingAmount);

      // Close the issue
      await issueTracker.closeIssue(issueId);
    });

    it("Should distribute reward to contributor", async function () {
      const contributor1BalanceBefore = await rewardToken.balanceOf(
        contributor1.address
      );
      const expectedReward = fundingAmount / 2n; // Split between 2 contributors

      await expect(
        rewardDistributor.distributeReward(issueId, contributor1.address)
      )
        .to.emit(rewardDistributor, "RewardDistributed")
        .withArgs(issueId, contributor1.address, expectedReward);

      expect(await rewardToken.balanceOf(contributor1.address)).to.equal(
        contributor1BalanceBefore + expectedReward
      );
      expect(
        await rewardDistributor.distributedRewards(issueId, contributor1.address)
      ).to.equal(expectedReward);
    });

    it("Should revert if not a contributor", async function () {
      await expect(
        rewardDistributor.distributeReward(issueId, other.address)
      ).to.be.revertedWith("Not a contributor");
    });

    it("Should revert if issue is not closed", async function () {
      // Create a new issue that's not closed
      await issueTracker.connect(owner).registerIssue(OWNER, REPO, 2n);
      const newIssueId = await issueTracker.generateIssueId(OWNER, REPO, 2n);

      await issueTracker.addContributor(newIssueId, contributor1.address);

      await expect(
        rewardDistributor.distributeReward(newIssueId, contributor1.address)
      ).to.be.revertedWith("Issue must be closed before distributing rewards");
    });

    it("Should revert if reward already distributed", async function () {
      const expectedReward = fundingAmount / 2n;

      await rewardDistributor.distributeReward(issueId, contributor1.address);

      await expect(
        rewardDistributor.distributeReward(issueId, contributor1.address)
      ).to.be.revertedWith("Reward already distributed");
    });

    it("Should revert if insufficient funds", async function () {
      // Create issue with no funding
      await issueTracker.connect(owner).registerIssue(OWNER, REPO, 3n);
      const newIssueId = await issueTracker.generateIssueId(OWNER, REPO, 3n);

      await issueTracker.addContributor(newIssueId, contributor1.address);
      await issueTracker.closeIssue(newIssueId);

      await expect(
        rewardDistributor.distributeReward(newIssueId, contributor1.address)
      ).to.be.revertedWith("Insufficient funds in contract");
    });
  });

  describe("distributeAllRewards", function () {
    let issueId: string;
    const fundingAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await issueTracker.connect(owner).registerIssue(OWNER, REPO, ISSUE_NUMBER);
      issueId = await issueTracker.generateIssueId(OWNER, REPO, ISSUE_NUMBER);

      await issueTracker.addContributor(issueId, contributor1.address);
      await issueTracker.addContributor(issueId, contributor2.address);

      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        fundingAmount
      );
      await rewardDistributor.connect(funder).depositFunds(issueId, fundingAmount);
      await issueTracker.recordFunding(issueId, funder.address, fundingAmount);
      await issueTracker.closeIssue(issueId);
    });

    it("Should distribute rewards to all contributors", async function () {
      const expectedReward = fundingAmount / 2n;

      const contributor1BalanceBefore = await rewardToken.balanceOf(
        contributor1.address
      );
      const contributor2BalanceBefore = await rewardToken.balanceOf(
        contributor2.address
      );

      await rewardDistributor.distributeAllRewards(issueId);

      expect(await rewardToken.balanceOf(contributor1.address)).to.equal(
        contributor1BalanceBefore + expectedReward
      );
      expect(await rewardToken.balanceOf(contributor2.address)).to.equal(
        contributor2BalanceBefore + expectedReward
      );

      expect(
        await rewardDistributor.distributedRewards(issueId, contributor1.address)
      ).to.equal(expectedReward);
      expect(
        await rewardDistributor.distributedRewards(issueId, contributor2.address)
      ).to.equal(expectedReward);
    });
  });

  describe("getPendingReward", function () {
    let issueId: string;
    const fundingAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await issueTracker.connect(owner).registerIssue(OWNER, REPO, ISSUE_NUMBER);
      issueId = await issueTracker.generateIssueId(OWNER, REPO, ISSUE_NUMBER);

      await issueTracker.addContributor(issueId, contributor1.address);
      await issueTracker.addContributor(issueId, contributor2.address);

      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        fundingAmount
      );
      await rewardDistributor.connect(funder).depositFunds(issueId, fundingAmount);
      await issueTracker.recordFunding(issueId, funder.address, fundingAmount);
    });

    it("Should return 0 if issue is not closed", async function () {
      expect(
        await rewardDistributor.getPendingReward(issueId, contributor1.address)
      ).to.equal(0);
    });

    it("Should return correct pending reward after issue is closed", async function () {
      await issueTracker.closeIssue(issueId);
      const expectedReward = fundingAmount / 2n;

      expect(
        await rewardDistributor.getPendingReward(issueId, contributor1.address)
      ).to.equal(expectedReward);
    });

    it("Should return 0 if reward already distributed", async function () {
      await issueTracker.closeIssue(issueId);
      await rewardDistributor.distributeReward(issueId, contributor1.address);

      expect(
        await rewardDistributor.getPendingReward(issueId, contributor1.address)
      ).to.equal(0);
    });

    it("Should return 0 if not a contributor", async function () {
      await issueTracker.closeIssue(issueId);

      expect(
        await rewardDistributor.getPendingReward(issueId, other.address)
      ).to.equal(0);
    });
  });

  describe("getTotalPendingRewards", function () {
    let issueId: string;
    const fundingAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await issueTracker.connect(owner).registerIssue(OWNER, REPO, ISSUE_NUMBER);
      issueId = await issueTracker.generateIssueId(OWNER, REPO, ISSUE_NUMBER);

      await issueTracker.addContributor(issueId, contributor1.address);
      await issueTracker.addContributor(issueId, contributor2.address);

      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        fundingAmount
      );
      await rewardDistributor.connect(funder).depositFunds(issueId, fundingAmount);
      await issueTracker.recordFunding(issueId, funder.address, fundingAmount);
    });

    it("Should return 0 if issue is not closed", async function () {
      expect(await rewardDistributor.getTotalPendingRewards(issueId)).to.equal(0);
    });

    it("Should return total pending rewards after issue is closed", async function () {
      await issueTracker.closeIssue(issueId);

      expect(await rewardDistributor.getTotalPendingRewards(issueId)).to.equal(
        fundingAmount
      );
    });

    it("Should return remaining pending rewards after partial distribution", async function () {
      await issueTracker.closeIssue(issueId);
      await rewardDistributor.distributeReward(issueId, contributor1.address);

      const expectedRemaining = fundingAmount / 2n;
      expect(await rewardDistributor.getTotalPendingRewards(issueId)).to.equal(
        expectedRemaining
      );
    });
  });

  describe("getIssueBalance", function () {
    it("Should return 0 for issue with no funds", async function () {
      const issueId = await issueTracker.generateIssueId(
        OWNER,
        REPO,
        ISSUE_NUMBER
      );

      expect(await rewardDistributor.getIssueBalance(issueId)).to.equal(0);
    });

    it("Should return correct balance after funding", async function () {
      const amount = ethers.parseEther("100");
      const issueId = await issueTracker.generateIssueId(
        OWNER,
        REPO,
        ISSUE_NUMBER
      );

      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        amount
      );
      await rewardDistributor.connect(funder).depositFunds(issueId, amount);

      expect(await rewardDistributor.getIssueBalance(issueId)).to.equal(amount);
    });
  });

  describe("areAllRewardsDistributed", function () {
    let issueId: string;
    const fundingAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await issueTracker.connect(owner).registerIssue(OWNER, REPO, ISSUE_NUMBER);
      issueId = await issueTracker.generateIssueId(OWNER, REPO, ISSUE_NUMBER);

      await issueTracker.addContributor(issueId, contributor1.address);
      await issueTracker.addContributor(issueId, contributor2.address);

      await rewardToken.connect(funder).approve(
        await rewardDistributor.getAddress(),
        fundingAmount
      );
      await rewardDistributor.connect(funder).depositFunds(issueId, fundingAmount);
      await issueTracker.recordFunding(issueId, funder.address, fundingAmount);
      await issueTracker.closeIssue(issueId);
    });

    it("Should return false when rewards not distributed", async function () {
      expect(
        await rewardDistributor.areAllRewardsDistributed(issueId)
      ).to.be.false;
    });

    it("Should return true when all rewards distributed", async function () {
      await rewardDistributor.distributeAllRewards(issueId);

      expect(
        await rewardDistributor.areAllRewardsDistributed(issueId)
      ).to.be.true;
    });

    it("Should return true for issue with no contributors", async function () {
      await issueTracker.connect(owner).registerIssue(OWNER, REPO, 4n);
      const newIssueId = await issueTracker.generateIssueId(OWNER, REPO, 4n);

      expect(
        await rewardDistributor.areAllRewardsDistributed(newIssueId)
      ).to.be.true;
    });
  });
});

