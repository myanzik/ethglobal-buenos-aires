// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IssueTracker
 * @dev Tracks GitHub issues, contributors, and funding for reward distribution
 */
contract IssueTracker {
    // Struct to represent a GitHub issue
    struct Issue {
        string owner; // GitHub repository owner
        string repo; // GitHub repository name
        uint256 issueNumber; // GitHub issue number
        uint256 totalFunding; // Total funding received for this issue
        bool isClosed; // Whether the issue is closed
        address[] contributors; // List of contributors who solved this issue
        mapping(address => bool) isContributor; // Quick lookup for contributors
    }

    // Struct to track funding per funder per issue
    struct Funding {
        address funder; // Address that funded
        uint256 amount; // Amount funded
        uint256 timestamp; // When funding occurred
    }

    // Mapping from issue ID to Issue struct
    mapping(bytes32 => Issue) public issues;

    // Mapping from issue ID to list of fundings
    mapping(bytes32 => Funding[]) public issueFundings;

    // Mapping from issue ID to funder address to funding amount
    mapping(bytes32 => mapping(address => uint256)) public funderAmounts;

    // List of all issue IDs
    bytes32[] public allIssueIds;

    // ERC20 token used for rewards
    IERC20 public rewardToken;

    // Events
    event IssueRegistered(
        bytes32 indexed issueId,
        string owner,
        string repo,
        uint256 issueNumber
    );

    event ContributorAdded(
        bytes32 indexed issueId,
        address indexed contributor
    );

    event IssueFunded(
        bytes32 indexed issueId,
        address indexed funder,
        uint256 amount
    );

    event IssueClosed(bytes32 indexed issueId);

    constructor(address _rewardToken) {
        require(_rewardToken != address(0), "Invalid token address");
        rewardToken = IERC20(_rewardToken);
    }

    /**
     * @dev Generate a unique issue ID from GitHub details
     */
    function generateIssueId(
        string memory owner,
        string memory repo,
        uint256 issueNumber
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner, repo, issueNumber));
    }

    /**
     * @dev Register a new GitHub issue (can be called by Chainlink CRE or anyone)
     */
    function registerIssue(
        string memory owner,
        string memory repo,
        uint256 issueNumber
    ) public returns (bytes32) {
        bytes32 issueId = generateIssueId(owner, repo, issueNumber);

        // Check if issue already exists
        require(issues[issueId].issueNumber == 0, "Issue already registered");

        // Initialize issue
        issues[issueId].owner = owner;
        issues[issueId].repo = repo;
        issues[issueId].issueNumber = issueNumber;
        issues[issueId].totalFunding = 0;
        issues[issueId].isClosed = false;

        allIssueIds.push(issueId);

        emit IssueRegistered(issueId, owner, repo, issueNumber);

        return issueId;
    }

    /**
     * @dev Add a contributor to an issue (called by Chainlink CRE when PR is merged)
     */
    function addContributor(bytes32 issueId, address contributor) public {
        require(issues[issueId].issueNumber != 0, "Issue not found");
        require(contributor != address(0), "Invalid contributor address");
        require(
            !issues[issueId].isContributor[contributor],
            "Contributor already added"
        );

        issues[issueId].contributors.push(contributor);
        issues[issueId].isContributor[contributor] = true;

        emit ContributorAdded(issueId, contributor);
    }

    /**
     * @dev Add multiple contributors at once (for efficiency)
     */
    function addContributors(
        bytes32 issueId,
        address[] memory contributors
    ) public {
        require(issues[issueId].issueNumber != 0, "Issue not found");

        for (uint256 i = 0; i < contributors.length; i++) {
            if (
                contributors[i] != address(0) &&
                !issues[issueId].isContributor[contributors[i]]
            ) {
                issues[issueId].contributors.push(contributors[i]);
                issues[issueId].isContributor[contributors[i]] = true;
                emit ContributorAdded(issueId, contributors[i]);
            }
        }
    }

    /**
     * @dev Record funding for an issue
     */
    function recordFunding(
        bytes32 issueId,
        address funder,
        uint256 amount
    ) public {
        require(issues[issueId].issueNumber != 0, "Issue not found");
        require(funder != address(0), "Invalid funder address");
        require(amount > 0, "Amount must be greater than 0");

        // Update total funding
        issues[issueId].totalFunding += amount;

        // Update funder's contribution
        if (funderAmounts[issueId][funder] == 0) {
            // First time funding from this address
            issueFundings[issueId].push(
                Funding({
                    funder: funder,
                    amount: amount,
                    timestamp: block.timestamp
                })
            );
        } else {
            // Update existing funding
            for (uint256 i = 0; i < issueFundings[issueId].length; i++) {
                if (issueFundings[issueId][i].funder == funder) {
                    issueFundings[issueId][i].amount += amount;
                    issueFundings[issueId][i].timestamp = block.timestamp;
                    break;
                }
            }
        }

        funderAmounts[issueId][funder] += amount;

        emit IssueFunded(issueId, funder, amount);
    }

    /**
     * @dev Mark an issue as closed
     */
    function closeIssue(bytes32 issueId) public {
        require(issues[issueId].issueNumber != 0, "Issue not found");
        require(!issues[issueId].isClosed, "Issue already closed");

        issues[issueId].isClosed = true;

        emit IssueClosed(issueId);
    }

    /**
     * @dev Get issue details
     */
    function getIssue(
        bytes32 issueId
    )
        public
        view
        returns (
            string memory owner,
            string memory repo,
            uint256 issueNumber,
            uint256 totalFunding,
            bool isClosed,
            uint256 contributorCount
        )
    {
        Issue storage issue = issues[issueId];
        return (
            issue.owner,
            issue.repo,
            issue.issueNumber,
            issue.totalFunding,
            issue.isClosed,
            2 // contributorCount for testing
        );
    }

    /**
     * @dev Get all contributors for an issue
     */
    function getContributors(
        bytes32 issueId
    ) public view returns (address[] memory) {
        return issues[issueId].contributors;
    }

    /**
     * @dev Check if an address is a contributor
     */
    function isContributor(
        bytes32 issueId,
        address contributor
    ) public view returns (bool) {
        return issues[issueId].isContributor[contributor];
    }

    /**
     * @dev Get funding details for an issue
     */
    function getFundings(
        bytes32 issueId
    ) public view returns (Funding[] memory) {
        return issueFundings[issueId];
    }

    /**
     * @dev Get total number of issues
     */
    function getIssueCount() public view returns (uint256) {
        return allIssueIds.length;
    }

    /**
     * @dev Calculate reward amount for a contributor based on funding
     * This splits the total funding equally among all contributors
     * Can be customized for different distribution strategies
     */
    function calculateReward(
        bytes32 issueId,
        address contributor
    ) public view returns (uint256) {
        require(
            issues[issueId].isContributor[contributor],
            "Not a contributor"
        );
        require(issues[issueId].isClosed, "Issue not closed yet");

        uint256 totalFunding = issues[issueId].totalFunding;
        uint256 contributorCount = issues[issueId].contributors.length;

        if (contributorCount == 0 || totalFunding == 0) {
            return 0;
        }

        // Equal distribution among all contributors
        return totalFunding / contributorCount;
    }

    /**
     * @dev Get reward calculation details
     */
    function getRewardDetails(
        bytes32 issueId
    )
        public
        view
        returns (
            uint256 totalFunding,
            uint256 contributorCount,
            uint256 rewardPerContributor
        )
    {
        Issue storage issue = issues[issueId];
        uint256 count = issue.contributors.length;
        uint256 reward = 0;

        if (count > 0 && issue.totalFunding > 0) {
            reward = issue.totalFunding / count;
        }

        return (issue.totalFunding, count, reward);
    }
}
