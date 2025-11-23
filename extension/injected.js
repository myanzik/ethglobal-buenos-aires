// Injected script that runs in page context to access window.ethereum
// This file is injected into the page to bypass content script isolation

(function() {
  'use strict';

  // Mark that this script is loaded
  window.__GITHUB_BOUNTY_INJECTED__ = true;
  console.log('GitHub Bounty: Injected script initialized');

  // Function to load ethers.js from extension resources
  async function loadEthersFromExtension() {
    return new Promise((resolve, reject) => {
      // Check if ethers is already loaded
      if (typeof ethers !== 'undefined') {
        resolve();
        return;
      }

      // Get the extension URL from the injected.js script src
      const scripts = document.querySelectorAll('script[src*="injected.js"]');
      let extensionUrl = null;
      
      if (scripts.length > 0) {
        const src = scripts[scripts.length - 1].src;
        // Extract extension URL (e.g., chrome-extension://xxx/)
        const match = src.match(/^(chrome-extension:\/\/[^\/]+)/);
        if (match) {
          extensionUrl = match[1];
        }
      }

      if (!extensionUrl) {
        reject(new Error('Could not determine extension URL'));
        return;
      }

      const ethersScript = document.createElement('script');
      ethersScript.src = extensionUrl + '/ethers.js';
      ethersScript.onload = () => {
        if (typeof ethers !== 'undefined') {
          resolve();
        } else {
          reject(new Error('Failed to load ethers.js'));
        }
      };
      ethersScript.onerror = () => reject(new Error('Failed to load ethers.js'));
      document.head.appendChild(ethersScript);
    });
  }

  // Listen for messages from content script
  window.addEventListener('message', async function(event) {
    console.log('GitHub Bounty: Injected script received message:', event.data);
    // Only accept messages from our extension
    if (event.data && event.data.type && event.data.type.startsWith('GITHUB_BOUNTY_')) {
      const { type, payload } = event.data;

      if (type === 'GITHUB_BOUNTY_CHECK_METAMASK') {
        const isInstalled = typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
        window.postMessage({
          type: 'GITHUB_BOUNTY_METAMASK_CHECK',
          isInstalled: isInstalled
        }, '*');
      }

      if (type === 'GITHUB_BOUNTY_CONNECT_METAMASK') {
        console.log('GitHub Bounty: Injected script handling CONNECT_METAMASK');
        try {
          console.log('GitHub Bounty: Checking window.ethereum:', typeof window.ethereum);
          if (typeof window.ethereum === 'undefined' || !window.ethereum.isMetaMask) {
            console.error('GitHub Bounty: MetaMask not found');
            window.postMessage({
              type: 'GITHUB_BOUNTY_METAMASK_ERROR',
              error: 'MetaMask is not installed. Please install MetaMask to continue.'
            }, '*');
            return;
          }

          const chainId = payload.chainId;
          console.log('GitHub Bounty: Requesting accounts from MetaMask, chainId:', chainId);
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
          });
          console.log('GitHub Bounty: Received accounts:', accounts);

          if (accounts.length === 0) {
            window.postMessage({
              type: 'GITHUB_BOUNTY_METAMASK_ERROR',
              error: 'No accounts found. Please unlock MetaMask.'
            }, '*');
            return;
          }

          const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
          if (currentChainId !== chainId) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainId }],
              });
            } catch (switchError) {
              if (switchError.code === 4902) {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: chainId,
                    chainName: 'Base Sepolia',
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: ['https://sepolia.base.org'],
                    blockExplorerUrls: ['https://sepolia.basescan.org']
                  }],
                });
              } else {
                throw switchError;
              }
            }
          }

          window.postMessage({
            type: 'GITHUB_BOUNTY_METAMASK_CONNECTED',
            account: accounts[0]
          }, '*');
        } catch (error) {
          window.postMessage({
            type: 'GITHUB_BOUNTY_METAMASK_ERROR',
            error: error.message || 'Failed to connect to MetaMask'
          }, '*');
        }
      }

      if (type === 'GITHUB_BOUNTY_GET_BALANCE') {
        try {
          const account = payload.account;
          const tokenAddress = payload.tokenAddress;

          // Load ethers if not available
          if (typeof ethers === 'undefined') {
            await loadEthersFromExtension();
          }

          if (typeof window.ethereum === 'undefined') {
            window.postMessage({
              type: 'GITHUB_BOUNTY_BALANCE_RESULT',
              error: 'MetaMask not available'
            }, '*');
            return;
          }

          const provider = new ethers.BrowserProvider(window.ethereum);
          const tokenContract = new ethers.Contract(
            tokenAddress,
            [
              {
                inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
              },
              {
                inputs: [],
                name: 'decimals',
                outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            provider
          );

          const balance = await tokenContract.balanceOf(account);
          const decimals = await tokenContract.decimals();

          window.postMessage({
            type: 'GITHUB_BOUNTY_BALANCE_RESULT',
            balance: balance.toString(),
            decimals: decimals
          }, '*');
        } catch (error) {
          window.postMessage({
            type: 'GITHUB_BOUNTY_BALANCE_RESULT',
            error: error.message || 'Failed to get balance'
          }, '*');
        }
      }

      if (type === 'GITHUB_BOUNTY_CHECK_ALLOWANCE') {
        try {
          const account = payload.account;
          const tokenAddress = payload.tokenAddress;
          const spenderAddress = payload.spenderAddress;
          const amount = payload.amount;

          // Load ethers if not available
          if (typeof ethers === 'undefined') {
            await loadEthersFromExtension();
          }

          if (typeof window.ethereum === 'undefined') {
            window.postMessage({
              type: 'GITHUB_BOUNTY_ALLOWANCE_RESULT',
              error: 'MetaMask not available'
            }, '*');
            return;
          }

          const provider = new ethers.BrowserProvider(window.ethereum);
          const tokenContract = new ethers.Contract(
            tokenAddress,
            [
              {
                inputs: [
                  { internalType: 'address', name: 'owner', type: 'address' },
                  { internalType: 'address', name: 'spender', type: 'address' }
                ],
                name: 'allowance',
                outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
              },
              {
                inputs: [],
                name: 'decimals',
                outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            provider
          );

          const decimals = await tokenContract.decimals();
          const allowance = await tokenContract.allowance(account, spenderAddress);
          const amountWei = ethers.parseUnits(amount.toString(), decimals);
          
          const isApproved = allowance >= amountWei;

          window.postMessage({
            type: 'GITHUB_BOUNTY_ALLOWANCE_RESULT',
            allowance: allowance.toString(),
            decimals: decimals,
            isApproved: isApproved
          }, '*');
        } catch (error) {
          window.postMessage({
            type: 'GITHUB_BOUNTY_ALLOWANCE_RESULT',
            error: error.message || 'Failed to check allowance'
          }, '*');
        }
      }

      if (type === 'GITHUB_BOUNTY_APPROVE_TOKENS') {
        try {
          const account = payload.account;
          const amount = payload.amount;
          const tokenAddress = payload.tokenAddress;
          const spenderAddress = payload.spenderAddress;

          // Load ethers if not available
          if (typeof ethers === 'undefined') {
            await loadEthersFromExtension();
          }

          if (typeof window.ethereum === 'undefined') {
            window.postMessage({
              type: 'GITHUB_BOUNTY_APPROVE_RESULT',
              error: 'MetaMask not available'
            }, '*');
            return;
          }

          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const tokenContract = new ethers.Contract(
            tokenAddress,
            [
              {
                inputs: [
                  { internalType: 'address', name: 'spender', type: 'address' },
                  { internalType: 'uint256', name: 'amount', type: 'uint256' }
                ],
                name: 'approve',
                outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
                stateMutability: 'nonpayable',
                type: 'function'
              },
              {
                inputs: [],
                name: 'decimals',
                outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            signer
          );

          const decimals = await tokenContract.decimals();
          const amountWei = ethers.parseUnits(amount.toString(), decimals);

          const tx = await tokenContract.approve(spenderAddress, amountWei);
          const receipt = await tx.wait();

          window.postMessage({
            type: 'GITHUB_BOUNTY_APPROVE_RESULT',
            txHash: tx.hash,
            receipt: receipt
          }, '*');
        } catch (error) {
          window.postMessage({
            type: 'GITHUB_BOUNTY_APPROVE_RESULT',
            error: error.message || 'Failed to approve tokens'
          }, '*');
        }
      }

      if (type === 'GITHUB_BOUNTY_FUND_ISSUE') {
        try {
          const account = payload.account;
          const owner = payload.owner;
          const repo = payload.repo;
          const issueNumber = payload.issueNumber;
          const amount = payload.amount;
          const rewardDistributorAddress = payload.rewardDistributorAddress;
          console.log('GitHub Bounty: Reward distributor address:', rewardDistributorAddress);
          const tokenAddress = payload.tokenAddress;

          // Load ethers if not available
          if (typeof ethers === 'undefined') {
            await loadEthersFromExtension();
          }

          if (typeof window.ethereum === 'undefined') {
            window.postMessage({
              type: 'GITHUB_BOUNTY_FUND_RESULT',
              error: 'MetaMask not available'
            }, '*');
            return;
          }

          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          // Get token decimals
          const tokenContract = new ethers.Contract(
            tokenAddress,
            [
              {
                inputs: [],
                name: 'decimals',
                outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            provider
          );
          const decimals = await tokenContract.decimals();
          const amountWei = ethers.parseUnits(amount.toString(), decimals);

          // Call fundIssue on RewardDistributor
          const rewardDistributorContract = new ethers.Contract(
            rewardDistributorAddress,
            [
              {
                inputs: [
                  { internalType: 'string', name: 'owner', type: 'string' },
                  { internalType: 'string', name: 'repo', type: 'string' },
                  { internalType: 'uint256', name: 'issueNumber', type: 'uint256' },
                  { internalType: 'uint256', name: 'amount', type: 'uint256' }
                ],
                name: 'fundIssue',
                outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
                stateMutability: 'nonpayable',
                type: 'function'
              }
            ],
            signer
          );

          console.log('GitHub Bounty: Funding issue with amount:', BigInt(amountWei));
          console.log('GitHub Bounty: Owner:', owner);
          console.log('GitHub Bounty: Repo:', repo);
          console.log('GitHub Bounty: Issue number:', issueNumber);
          console.log("FUNDING THE ISSUE NOW...");
          console.log(rewardDistributorContract);
          const tx = await rewardDistributorContract.fundIssue(owner, repo, 9, 10000);
          console.log('GitHub Bounty: Transaction:', tx);
          const receipt = await tx.wait();

          // Get the issueId from the transaction receipt (it's returned by fundIssue)
          let issueId = null;
          try {
            // Try to decode the return value from the transaction
            const result = await rewardDistributorContract.fundIssue.staticCall(owner, repo, issueNumber, BigInt(amountWei));
            issueId = result;
          } catch (e) {
            // If we can't get it from static call, we'll just use null
            console.log('Could not get issueId from static call');
          }

          window.postMessage({
            type: 'GITHUB_BOUNTY_FUND_RESULT',
            txHash: tx.hash,
            receipt: receipt,
            issueId: issueId
          }, '*');
        } catch (error) {
          window.postMessage({
            type: 'GITHUB_BOUNTY_FUND_RESULT',
            error: error.message || 'Failed to fund issue'
          }, '*');
        }
      }

      // Get pending reward for a contributor
      if (type === 'GITHUB_BOUNTY_GET_PENDING_REWARD') {
        try {
          const account = payload.account;
          const owner = payload.owner;
          const repo = payload.repo;
          const issueNumber = payload.issueNumber;
          const rewardDistributorAddress = payload.rewardDistributorAddress;

          // Load ethers if not available
          if (typeof ethers === 'undefined') {
            await loadEthersFromExtension();
          }

          if (typeof window.ethereum === 'undefined') {
            window.postMessage({
              type: 'GITHUB_BOUNTY_PENDING_REWARD_RESULT',
              error: 'MetaMask not available'
            }, '*');
            return;
          }

          const provider = new ethers.BrowserProvider(window.ethereum);

          // RewardDistributor ABI for getPendingReward
          const rewardDistributorABI = [
            {
              inputs: [
                { internalType: 'bytes32', name: 'issueId', type: 'bytes32' },
                { internalType: 'address', name: 'contributor', type: 'address' }
              ],
              name: 'getPendingReward',
              outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function'
            },
            {
              inputs: [],
              name: 'issueTracker',
              outputs: [{ internalType: 'address', name: '', type: 'address' }],
              stateMutability: 'view',
              type: 'function'
            }
          ];

          const rewardDistributorContract = new ethers.Contract(
            rewardDistributorAddress,
            rewardDistributorABI,
            provider
          );

          // Get issueTracker address
          const issueTrackerAddress = await rewardDistributorContract.issueTracker();

          // IssueTracker ABI for generateIssueId
          const issueTrackerABI = [
            {
              inputs: [
                { internalType: 'string', name: 'owner', type: 'string' },
                { internalType: 'string', name: 'repo', type: 'string' },
                { internalType: 'uint256', name: 'issueNumber', type: 'uint256' }
              ],
              name: 'generateIssueId',
              outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
              stateMutability: 'pure',
              type: 'function'
            }
          ];

          const issueTrackerContract = new ethers.Contract(
            issueTrackerAddress,
            issueTrackerABI,
            provider
          );

          // Generate issueId using the contract's pure function
          const issueId = await issueTrackerContract.generateIssueId.staticCall(owner, repo, issueNumber);

          // Get pending reward
          const pendingReward = await rewardDistributorContract.getPendingReward(issueId, account);

          // Get token decimals for formatting
          const tokenABI = [
            {
              inputs: [],
              name: 'decimals',
              outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
              stateMutability: 'view',
              type: 'function'
            }
          ];
          const tokenAddress = await rewardDistributorContract.rewardToken();
          const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
          const decimals = await tokenContract.decimals();

          // Format reward
          const rewardBigInt = BigInt(pendingReward.toString());
          const divisor = BigInt(10 ** decimals);
          const wholePart = rewardBigInt / divisor;
          const fractionalPart = rewardBigInt % divisor;
          const formatted = fractionalPart === 0n
            ? wholePart.toString()
            : `${wholePart}.${fractionalPart.toString().padStart(Number(decimals), '0').replace(/0+$/, '')}`;

          window.postMessage({
            type: 'GITHUB_BOUNTY_PENDING_REWARD_RESULT',
            amount: pendingReward.toString(),
            formatted: formatted
          }, '*');
        } catch (error) {
          window.postMessage({
            type: 'GITHUB_BOUNTY_PENDING_REWARD_RESULT',
            error: error.message || 'Failed to get pending reward'
          }, '*');
        }
      }

      // Claim reward
      if (type === 'GITHUB_BOUNTY_CLAIM_REWARD') {
        try {
          const owner = payload.owner;
          const repo = payload.repo;
          const issueNumber = payload.issueNumber;
          const wallet = payload.wallet;
          const githubUsername = payload.githubUsername;
          const rewardDistributorAddress = payload.rewardDistributorAddress;

          // Load ethers if not available
          if (typeof ethers === 'undefined') {
            await loadEthersFromExtension();
          }

          if (typeof window.ethereum === 'undefined') {
            window.postMessage({
              type: 'GITHUB_BOUNTY_CLAIM_RESULT',
              error: 'MetaMask not available'
            }, '*');
            return;
          }

          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();

          // RewardDistributor ABI for claimReward
          const rewardDistributorABI = [
            {
              inputs: [
                { internalType: 'string', name: 'owner', type: 'string' },
                { internalType: 'string', name: 'repo', type: 'string' },
                { internalType: 'uint256', name: 'issueNumber', type: 'uint256' },
                { internalType: 'address', name: 'wallet', type: 'address' },
                { internalType: 'string', name: 'githubUsername', type: 'string' }
              ],
              name: 'claimReward',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function'
            }
          ];

          const rewardDistributorContract = new ethers.Contract(
            rewardDistributorAddress,
            rewardDistributorABI,
            signer
          );

          console.log('GitHub Bounty: Claiming reward');
          console.log('GitHub Bounty: Owner:', owner);
          console.log('GitHub Bounty: Repo:', repo);
          console.log('GitHub Bounty: Issue Number:', issueNumber);
          console.log('GitHub Bounty: Wallet:', wallet);
          console.log('GitHub Bounty: GitHub Username:', githubUsername);

          // Call claimReward
          const tx = await rewardDistributorContract.claimReward(
            owner,
            repo,
            issueNumber,
            wallet,
            githubUsername
          );
          console.log('GitHub Bounty: Transaction:', tx);
          const receipt = await tx.wait();

          window.postMessage({
            type: 'GITHUB_BOUNTY_CLAIM_RESULT',
            txHash: tx.hash,
            receipt: receipt
          }, '*');
        } catch (error) {
          window.postMessage({
            type: 'GITHUB_BOUNTY_CLAIM_RESULT',
            error: error.message || 'Failed to claim reward'
          }, '*');
        }
      }
    }
  });
})();

