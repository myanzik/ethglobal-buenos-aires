# Issue Tracker Chainlink CRE Workflow

This Chainlink Runtime Environment (CRE) workflow automatically tracks GitHub issues and contributors, updating the IssueTracker contract on-chain.

## Features

- Monitors GitHub repositories for closed issues
- Identifies PRs that closed those issues
- Extracts contributor information from merged PRs
- Updates the IssueTracker contract with:
  - Issue registration
  - Contributor addresses
  - Issue closure status

## Configuration

Edit `config.staging.json`:

```json
{
  "schedule": "*/5 * * * *",
  "githubApiUrl": "https://api.github.com",
  "githubToken": "YOUR_GITHUB_TOKEN",
  "repositories": [
    {
      "owner": "your-org",
      "repo": "your-repo"
    }
  ],
  "evms": [
    {
      "issueTrackerAddress": "0x...",
      "chainSelectorName": "ethereum-testnet-sepolia",
      "gasLimit": "500000"
    }
  ],
  "contributorMapping": {
    "github-username-1": "0x1234567890123456789012345678901234567890",
    "github-username-2": "0x0987654321098765432109876543210987654321"
  }
}
```

### Configuration Fields

- **schedule**: Cron expression for how often to check (e.g., `*/5 * * * *` = every 5 minutes)
- **githubApiUrl**: GitHub API base URL (usually `https://api.github.com`)
- **githubToken**: GitHub personal access token with `repo` scope
- **repositories**: Array of repositories to monitor
- **evms**: Blockchain configuration
  - **issueTrackerAddress**: Deployed IssueTracker contract address
  - **chainSelectorName**: Chain selector name (e.g., `ethereum-testnet-sepolia`)
  - **gasLimit**: Gas limit for transactions
- **contributorMapping**: Mapping from GitHub usernames to Ethereum addresses

## Setup

1. Install dependencies:
```bash
cd chainlink/github-reward/issue-tracker-workflow
bun install
```

2. Create a GitHub personal access token:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create token with `repo` scope
   - Add to `config.staging.json`

3. Configure contributor mapping:
   - Map GitHub usernames to Ethereum addresses
   - This is required to identify contributors on-chain

4. Deploy IssueTracker contract:
   - Deploy the contract from `hardhat-contracts/contracts/issue-tracker.sol`
   - Update `issueTrackerAddress` in config

5. Run the workflow:
```bash
bun run main.ts
```

## How It Works

1. **Cron Trigger**: Runs on schedule (e.g., every 5 minutes)

2. **Fetch Closed Issues**: 
   - Queries GitHub API for closed issues in configured repositories
   - Filters out pull requests (only tracks actual issues)

3. **Find Closing PRs**:
   - For each closed issue, finds PRs that were merged around the time the issue was closed
   - Extracts contributor usernames from those PRs

4. **Map to Addresses**:
   - Uses `contributorMapping` to convert GitHub usernames to Ethereum addresses
   - Skips contributors without mappings

5. **Update On-Chain**:
   - Registers issue if not already registered
   - Adds contributors to the issue
   - Closes the issue on-chain

## Limitations

- Currently requires manual mapping of GitHub usernames to Ethereum addresses
- PR detection is based on timing (PRs merged within 1 hour of issue closure)
- Only processes closed issues

## Future Improvements

- Integrate with GitHub's "Closes #123" detection
- Use a registry contract for username-to-address mapping
- Support for multiple contributors per PR
- Better PR-to-issue linking logic

## Troubleshooting

**No contributors found:**
- Check that `contributorMapping` includes all relevant GitHub usernames
- Verify PRs were actually merged
- Check GitHub API rate limits

**Contract calls failing:**
- Verify contract address is correct
- Check gas limit is sufficient
- Ensure contract is deployed on the correct network

**GitHub API errors:**
- Verify GitHub token is valid and has correct scopes
- Check API rate limits
- Verify repository names are correct

