// Injected script that runs in page context to access window.ethereum
// This file is injected into the page to bypass content script isolation

(function() {
  'use strict';

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
                    chainName: 'Sepolia',
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: ['https://sepolia.infura.io/v3/'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io']
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
            await new Promise((resolve, reject) => {
              const ethersScript = document.createElement('script');
              ethersScript.src = 'https://cdn.ethers.io/lib/ethers-6.9.0.umd.min.js';
              ethersScript.onload = resolve;
              ethersScript.onerror = reject;
              document.head.appendChild(ethersScript);
            });
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

      if (type === 'GITHUB_BOUNTY_SEND_TOKENS') {
        try {
          const account = payload.account;
          const amount = payload.amount;
          const tokenAddress = payload.tokenAddress;
          const contractAddress = payload.contractAddress;

          // Load ethers if not available
          if (typeof ethers === 'undefined') {
            await new Promise((resolve, reject) => {
              const ethersScript = document.createElement('script');
              ethersScript.src = 'https://cdn.ethers.io/lib/ethers-6.9.0.umd.min.js';
              ethersScript.onload = resolve;
              ethersScript.onerror = reject;
              document.head.appendChild(ethersScript);
            });
          }

          if (typeof window.ethereum === 'undefined') {
            window.postMessage({
              type: 'GITHUB_BOUNTY_SEND_RESULT',
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
                  { internalType: 'address', name: 'to', type: 'address' },
                  { internalType: 'uint256', name: 'amount', type: 'uint256' }
                ],
                name: 'transfer',
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

          const tx = await tokenContract.transfer(contractAddress, amountWei);
          const receipt = await tx.wait();

          window.postMessage({
            type: 'GITHUB_BOUNTY_SEND_RESULT',
            txHash: tx.hash,
            receipt: receipt
          }, '*');
        } catch (error) {
          window.postMessage({
            type: 'GITHUB_BOUNTY_SEND_RESULT',
            error: error.message || 'Failed to send tokens'
          }, '*');
        }
      }
    }
  });
})();

