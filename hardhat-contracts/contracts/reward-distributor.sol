// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./issue-tracker.sol";

/**
 * @title RewardDistributor
 * @dev Holds funds for issues and distributes rewards to contributors
 */
contract RewardDistributor {
    using SafeERC20 for IERC20;

    IssueTracker public issueTracker;
    IERC20 public rewardToken;

    // Mapping from issue ID to total funds held
    mapping(bytes32 => uint256) public issueFunds;

    // Mapping from issue ID to contributor address to amount already distributed
    mapping(bytes32 => mapping(address => uint256)) public distributedRewards;

    // Events
    event FundsDeposited(
        bytes32 indexed issueId,
        address indexed funder,
        uint256 amount
    );

    event RewardDistributed(
        bytes32 indexed issueId,
        address indexed contributor,
        uint256 amount
    );

    event FundsWithdrawn(
        bytes32 indexed issueId,
        address indexed funder,
        uint256 amount
    );

    constructor(address _issueTracker, address _rewardToken) {
        require(_issueTracker != address(0), "Invalid issue tracker address");
        require(_rewardToken != address(0), "Invalid token address");

        issueTracker = IssueTracker(_issueTracker);
        rewardToken = IERC20(_rewardToken);
    }

    /**
     * @dev Deposit funds for an issue
     * This should be called when someone wants to fund an issue
     */
    function depositFunds(bytes32 issueId, uint256 amount) public {
        require(amount > 0, "Amount must be greater than 0");

        // // Check if issue exists, if not register it
        // (, , uint256 issueNumber, , , ) = issueTracker.getIssue(issueId);
        // if (issueNumber == 0) {
        //     revert("Issue not registered. Please register issue first.");
        // }

        // Transfer tokens from funder to this contract
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update tracking
        issueFunds[issueId] += amount;

        // Record funding in issue tracker
        issueTracker.recordFunding(issueId, msg.sender, amount);

        emit FundsDeposited(issueId, msg.sender, amount);
    }

    /**
     * @dev Deposit funds and register issue in one transaction
     */
    function fundIssue(
        string memory owner,
        string memory repo,
        uint256 issueNumber,
        uint256 amount
    ) public returns (bytes32) {
        require(amount > 0, "Amount must be greater than 0");

        // Generate or get issue ID
        bytes32 issueId = issueTracker.generateIssueId(
            owner,
            repo,
            issueNumber
        );

        // Check if issue exists, register if not
        (, , uint256 existingIssueNumber, , , ) = issueTracker.getIssue(
            issueId
        );
        if (existingIssueNumber == 0) {
            issueTracker.registerIssue(owner, repo, issueNumber);
        }

        // Deposit funds
        depositFunds(issueId, amount);

        return issueId;
    }

    /**
     * @dev Distribute rewards to a specific contributor
     */
    function distributeReward(bytes32 issueId, address contributor) public {
        require(
            issueTracker.isContributor(issueId, contributor),
            "Not a contributor"
        );

        // Check if issue is closed
        (, , , , bool isClosed, ) = issueTracker.getIssue(issueId);
        require(isClosed, "Issue must be closed before distributing rewards");

        // Calculate reward
        uint256 reward = issueTracker.calculateReward(issueId, contributor);
        require(reward > 0, "No reward to distribute");

        // Check if already distributed
        require(
            distributedRewards[issueId][contributor] == 0,
            "Reward already distributed"
        );

        // Check contract has enough funds
        require(
            issueFunds[issueId] >= reward,
            "Insufficient funds in contract"
        );

        // Update tracking
        distributedRewards[issueId][contributor] = reward;
        issueFunds[issueId] -= reward;

        // Transfer reward to contributor
        rewardToken.safeTransfer(contributor, reward);

        emit RewardDistributed(issueId, contributor, reward);
    }

    /**
     * @dev Distribute rewards to all contributors of an issue
     */
    function distributeAllRewards(bytes32 issueId) public {
        address[] memory contributors = issueTracker.getContributors(issueId);

        for (uint256 i = 0; i < contributors.length; i++) {
            if (distributedRewards[issueId][contributors[i]] == 0) {
                distributeReward(issueId, contributors[i]);
            }
        }
    }

    /**
     * @dev Get pending reward for a contributor
     */
    function getPendingReward(
        bytes32 issueId,
        address contributor
    ) public view returns (uint256) {
        if (!issueTracker.isContributor(issueId, contributor)) {
            return 0;
        }

        if (distributedRewards[issueId][contributor] > 0) {
            return 0; // Already distributed
        }

        // Check if issue is closed
        (, , , , bool isClosed, ) = issueTracker.getIssue(issueId);
        if (!isClosed) {
            return 0;
        }

        return issueTracker.calculateReward(issueId, contributor);
    }

    /**
     * @dev Get total pending rewards for an issue
     */
    function getTotalPendingRewards(
        bytes32 issueId
    ) public view returns (uint256) {
        address[] memory contributors = issueTracker.getContributors(issueId);
        uint256 total = 0;

        for (uint256 i = 0; i < contributors.length; i++) {
            total += getPendingReward(issueId, contributors[i]);
        }

        return total;
    }

    /**
     * @dev Get contract balance for an issue
     */
    function getIssueBalance(bytes32 issueId) public view returns (uint256) {
        return issueFunds[issueId];
    }

    /**
     * @dev Check if all rewards have been distributed for an issue
     */
    function areAllRewardsDistributed(
        bytes32 issueId
    ) public view returns (bool) {
        address[] memory contributors = issueTracker.getContributors(issueId);

        if (contributors.length == 0) {
            return true;
        }

        for (uint256 i = 0; i < contributors.length; i++) {
            if (distributedRewards[issueId][contributors[i]] == 0) {
                return false;
            }
        }

        return true;
    }
}
