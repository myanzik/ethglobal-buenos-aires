# GitThunder - GitHub Bounty & Reward System

A decentralized funding mechanism for open-source projects that incentivizes contributions by attaching financial rewards to GitHub issues. Contributors can claim bounties, submit PRs, and automatically receive rewards when their work is merged.

## 🎯 Overview

GitThunder enables maintainers to fund GitHub issues with crypto rewards, allowing contributors to claim bounties and receive automated payouts when their pull requests are merged. The system integrates GitHub with blockchain smart contracts through Chainlink's Cross-Chain Interoperability Protocol (CCIP) and Chainlink Runtime Environment (CRE).

## 🏗️ Architecture

The project consists of four main components:

### 1. **Smart Contracts** (`hardhat-contracts/`)

- **IssueTracker**: Tracks GitHub issues, contributors, and funding on-chain
- **RewardDistributor**: Holds funds in escrow and distributes rewards to contributors
- Built with Solidity, Hardhat, and OpenZeppelin contracts
- Deployed on Base Sepolia testnet

### 2. **Chainlink CRE Workflows** (`chainlink/`)

- **GitHub Issue Tracker Workflow**: Monitors GitHub for closed issues and merged PRs
- Automatically updates smart contracts when PRs are merged
- Extracts contributor information and links PRs to issues
- Uses Chainlink Runtime Environment for off-chain automation

### 3. **Web Dashboard** (`website/`)

- Next.js application for managing bounties
- Features:
  - GitHub OAuth authentication
  - View available bounties
  - Claim bounties
  - Deposit funds to issues
  - Track reward distribution
- Built with Next.js 16, React, Tailwind CSS, and Radix UI

### 4. **Browser Extension** (`extension/`)

- Chrome extension that enhances GitHub issue pages
- Injects bounty information directly into GitHub UI
- Shows funding status, claim buttons, and contributor rewards
- Integrates with MetaMask for wallet interactions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Bun (for Chainlink CRE workflows)
- MetaMask or compatible Web3 wallet
- GitHub account

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd ethglobal-buenos-aires
   ```

2. **Install dependencies**

   **Smart Contracts:**

   ```bash
   cd hardhat-contracts
   pnpm install
   ```

   **Web Dashboard:**

   ```bash
   cd website
   npm install
   ```

   **Chainlink Workflows:**

   ```bash
   cd chainlink/github-reward/github-issue
   bun install
   ```

3. **Configure environment variables**

   Create `.env` files in each directory with required keys (RPC URLs, private keys, API keys, etc.)

4. **Deploy contracts** (optional - contracts may already be deployed)

   ```bash
   cd hardhat-contracts
   pnpm deploy:base-sepolia
   ```

5. **Run the dashboard**

   ```bash
   cd website
   npm run dev
   ```

6. **Load the extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension/` directory

## 📋 Workflow

1. **Funding**: Funders deposit rewards into the RewardDistributor contract for specific GitHub issues
2. **Claiming**: Contributors claim bounties via the dashboard or browser extension
3. **Development**: Contributors submit PRs linked to the issue
4. **Review & Merge**: Maintainers review and merge PRs on GitHub
5. **Automation**: Chainlink CRE workflow detects the merge and updates the IssueTracker contract
6. **Payout**: Rewards are automatically distributed to contributors when the issue is closed

## 🛠️ Tech Stack

- **Blockchain**: Solidity, Hardhat, Ethers.js, OpenZeppelin
- **Automation**: Chainlink CRE, Chainlink CCIP
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, shadcn/ui
- **Extension**: Chrome Extension Manifest V3
- **Package Managers**: pnpm, npm, bun

## 📁 Project Structure

```
├── chainlink/              # Chainlink CRE workflows
│   ├── github-reward/      # GitHub issue tracking workflow
│   └── onchain-calculator/ # Calculator workflow example
├── extension/              # Chrome browser extension
├── hardhat-contracts/      # Smart contracts & deployment
├── website/                # Next.js web dashboard
└── docs/                   # Project documentation
```

## 🔗 Key Features

- ✅ On-chain issue tracking and funding
- ✅ Automated contributor detection via Chainlink CRE
- ✅ Transparent reward distribution
- ✅ GitHub-native UI integration via browser extension
- ✅ Web dashboard for bounty management
- ✅ Multi-funder support per issue
- ✅ Equal distribution of rewards among contributors

## 📚 Documentation

- [Issue Tracker Contracts README](hardhat-contracts/README-ISSUE-TRACKER.md)
- [Concept Note](docs/conceptNote.md)
- [Deployment Guide](hardhat-contracts/DEPLOYMENT.md)

## 🤝 Contributing

This project was built for ETHGlobal Buenos Aires. Contributions are welcome!

## 📄 License

[Add your license here]

---

Built with ❤️ for the open-source community
