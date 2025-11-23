# Issue Tracker & Reward Distributor Contracts

This directory contains smart contracts for tracking GitHub issues, contributors, and distributing rewards.

## Contracts

### 1. IssueTracker (`issue-tracker.sol`)

Tracks GitHub issues, contributors, and funding information.

**Key Features:**
- Register GitHub issues (owner, repo, issue number)
- Track contributors who solved issues
- Record funding from multiple funders
- Calculate reward amounts per contributor
- Mark issues as closed

**Main Functions:**
- `registerIssue(owner, repo, issueNumber)` - Register a new issue
- `addContributor(issueId, contributor)` - Add a contributor to an issue
- `addContributors(issueId, contributors[])` - Add multiple contributors at once
- `recordFunding(issueId, funder, amount)` - Record funding for an issue
- `closeIssue(issueId)` - Mark an issue as closed
- `calculateReward(issueId, contributor)` - Calculate reward for a contributor

### 2. RewardDistributor (`reward-distributor.sol`)

Holds funds and distributes rewards to contributors.

**Key Features:**
- Accept deposits for issues
- Hold funds until issue is closed
- Distribute rewards to contributors
- Track distributed rewards

**Main Functions:**
- `depositFunds(issueId, amount)` - Deposit funds for an issue
- `fundIssue(owner, repo, issueNumber, amount)` - Register and fund in one transaction
- `distributeReward(issueId, contributor)` - Distribute reward to a contributor
- `distributeAllRewards(issueId)` - Distribute rewards to all contributors
- `getPendingReward(issueId, contributor)` - Get pending reward amount

## Deployment

1. Install dependencies:
```bash
cd hardhat-contracts
pnpm install
```

2. Install OpenZeppelin contracts:
```bash
pnpm add @openzeppelin/contracts
```

3. Compile contracts:
```bash
npx hardhat compile
```

4. Deploy contracts (example script):
```typescript
// Deploy IssueTracker
const rewardToken = "0x..."; // ERC20 token address
const issueTracker = await IssueTracker.deploy(rewardToken);

// Deploy RewardDistributor
const rewardDistributor = await RewardDistributor.deploy(
  issueTracker.address,
  rewardToken
);
```

## Usage Flow

1. **Register Issue**: When a GitHub issue is created, register it on-chain
   ```solidity
   issueTracker.registerIssue("owner", "repo", issueNumber);
   ```

2. **Fund Issue**: Users can fund issues
   ```solidity
   rewardDistributor.fundIssue("owner", "repo", issueNumber, amount);
   ```

3. **Add Contributors**: When PRs are merged, add contributors (via Chainlink CRE)
   ```solidity
   issueTracker.addContributor(issueId, contributorAddress);
   ```

4. **Close Issue**: Mark issue as closed
   ```solidity
   issueTracker.closeIssue(issueId);
   ```

5. **Distribute Rewards**: After issue is closed, distribute rewards
   ```solidity
   rewardDistributor.distributeAllRewards(issueId);
   ```

## Integration with Chainlink CRE

The Chainlink Runtime Environment workflow (`chainlink/github-reward/issue-tracker-workflow/`) automatically:
- Monitors GitHub for closed issues
- Finds PRs that closed those issues
- Extracts contributor information
- Updates the IssueTracker contract

See the workflow README for configuration details.

## Reward Calculation

Currently, rewards are distributed equally among all contributors:
```
rewardPerContributor = totalFunding / contributorCount
```

This can be customized in the `calculateReward` function for different distribution strategies (e.g., based on PR size, time to close, etc.).

## Security Considerations

- Only authorized addresses should be able to add contributors (consider adding access control)
- Consider implementing a time lock for reward distribution
- Add validation for issue registration to prevent duplicates
- Consider rate limiting for funding operations

