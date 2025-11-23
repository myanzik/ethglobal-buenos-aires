// Content script to inject Sponsor button on GitHub issue pages

(function () {
  "use strict";

  // Check if chrome.runtime is available
  if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.getURL) {
    console.error("GitHub Bounty: Extension runtime not available. Please reload the extension.");
    // Don't proceed if chrome.runtime is not available
    return;
  }

  console.log("GitHub Bounty: Content script loaded");

  // Load ethers.js library
  function loadEthers() {
    return new Promise((resolve, reject) => {
      // Check if ethers is already loaded
      if (typeof ethers !== "undefined") {
        resolve(ethers);
        return;
      }

      // Load ethers.js from CDN
      const script = document.createElement("script");
      script.src = "https://cdn.ethers.io/lib/ethers-6.9.0.umd.min.js";
      script.onload = () => {
        if (typeof ethers !== "undefined") {
          resolve(ethers);
        } else {
          reject(new Error("Failed to load ethers.js"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load ethers.js"));
      document.head.appendChild(script);
    });
  }

  // Initialize ethers when needed
  let ethersLoaded = false;
  async function ensureEthers() {
    if (!ethersLoaded) {
      await loadEthers();
      ethersLoaded = true;
    }
  }

  // Function to find the New issue button and add Sponsor button next to it
  function addSponsorButton() {
    // Check if Sponsor button already exists
    if (document.getElementById("github-bounty-sponsor-btn")) {
      return;
    }

    // If on issue detail page, only show if issue is open
    if (isIssueDetailPage()) {
      if (!isIssueOpen()) {
        // Issue is closed, don't show sponsor button
        return;
      }
      // Issue is open, continue to add sponsor button
    }

    let newIssueButton = null;
    let targetContainer = null;
    
    // Strategy 1: Look for GitHub's issues page header/actions area
    const issuesHeader =
      document.querySelector(".subnav") ||
      document.querySelector('[data-testid="issues-header"]') ||
      document.querySelector(
        ".d-flex.flex-items-center.flex-justify-between.mb-3"
      ) ||
      document.querySelector(
        ".d-flex.flex-justify-between.flex-items-center.mb-3"
      );

    if (issuesHeader) {
      console.log("GitHub Bounty: Found issues header container");
      // Look for New issue button in the header
      const buttons = issuesHeader.querySelectorAll(
        'button, a[role="button"], a.btn'
      );
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || "";
        const ariaLabel = btn.getAttribute("aria-label") || "";
        const title = btn.getAttribute("title") || "";

        if (
          text === "New issue" ||
          text === "New Issue" ||
          ariaLabel.toLowerCase().includes("new issue") ||
          title.toLowerCase().includes("new issue") ||
          (text.includes("New") && text.includes("issue"))
        ) {
          newIssueButton = btn;
          targetContainer = issuesHeader;
          console.log("GitHub Bounty: Found New issue button in header");
          break;
        }
      }
    }

    // Strategy 2: Search all buttons on the page for New issue button
    if (!newIssueButton) {
      console.log("GitHub Bounty: Trying broader search for New issue button");
      const allButtons = document.querySelectorAll(
        'button, a[role="button"], a.btn'
      );
        for (const btn of allButtons) {
        const text = btn.textContent?.trim() || "";
        const ariaLabel = btn.getAttribute("aria-label") || "";
        const href = btn.getAttribute("href") || "";

        // Check if it's the New issue button
        if (
          text === "New issue" ||
          text === "New Issue" ||
          ariaLabel.toLowerCase().includes("new issue") ||
          (text.includes("New") && text.includes("issue")) ||
          (href.includes("/issues/new") && text.trim() !== "")
        ) {
          // Check if it's in a reasonable location (not too far down the page)
          const rect = btn.getBoundingClientRect();
          if (rect.top < 800 && rect.top > 0) {
            // Within first 800px from top
            newIssueButton = btn;
            targetContainer = btn.parentElement;
            console.log(
              "GitHub Bounty: Found New issue button by text/aria-label"
            );
            break;
          }
        }
      }
    }

    // Strategy 3: Look for links/buttons that go to /issues/new
    if (!newIssueButton) {
      const newIssueLinks = document.querySelectorAll(
        'a[href*="/issues/new"], button[onclick*="issues/new"]'
      );
      for (const link of newIssueLinks) {
        const rect = link.getBoundingClientRect();
        if (rect.top < 800 && rect.top > 0) {
          newIssueButton = link;
          targetContainer = link.parentElement;
          console.log("GitHub Bounty: Found New issue button by href");
              break;
        }
      }
    }

    if (!newIssueButton) {
      console.warn(
        "GitHub Bounty: New issue button not found. Current URL:",
        window.location.href
      );
      console.warn(
        "GitHub Bounty: Available buttons:",
        Array.from(document.querySelectorAll('button, a[role="button"]'))
          .slice(0, 10)
          .map((b) => ({
        text: b.textContent?.trim(),
            ariaLabel: b.getAttribute("aria-label"),
            href: b.getAttribute("href"),
            classes: b.className,
          }))
      );
      return;
    }

    // Create Sponsor button
    const sponsorButton = document.createElement("button");
    sponsorButton.id = "github-bounty-sponsor-btn";
    sponsorButton.className = newIssueButton.className || "btn";
    sponsorButton.textContent = "Sponsor";
    sponsorButton.setAttribute("type", "button");
    sponsorButton.style.marginRight = "8px";

    // Copy any relevant attributes from New issue button
    if (newIssueButton.hasAttribute("data-view-component")) {
      sponsorButton.setAttribute("data-view-component", "true");
    }
    
    // Add click handler
    sponsorButton.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleSponsorClick();
    });

    // Insert the button after the New issue button
    if (newIssueButton.nextSibling) {
      newIssueButton.parentNode.insertBefore(
        sponsorButton,
        newIssueButton.nextSibling
      );
    } else {
      newIssueButton.parentNode.insertBefore(sponsorButton, newIssueButton);
    }

    console.log(
      "GitHub Bounty: Sponsor button added successfully next to New issue button!"
    );
  }

  // Contract configuration
  const CONFIG = {
    // Token contract address (USDC on Base Sepolia)
    tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    // RewardDistributor contract address (Base Sepolia)
    rewardDistributorAddress: "0xD916aC68e161a2221BA6616d3EE5864626007EBb",
    // Chain ID for Base Sepolia testnet
    chainId: "0x14a34", // 84532 in hex
    chainName: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org", // Optional, MetaMask will use its own
  };

  // ERC20 ABI (minimal - just what we need)
  const ERC20_ABI = [
    {
      inputs: [
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "spender", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "approve",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "owner", type: "address" },
        { internalType: "address", name: "spender", type: "address" },
      ],
      name: "allowance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  // RewardDistributor ABI (minimal - just fundIssue function)
  const REWARD_DISTRIBUTOR_ABI = [
    {
      inputs: [
        { internalType: "string", name: "owner", type: "string" },
        { internalType: "string", name: "repo", type: "string" },
        { internalType: "uint256", name: "issueNumber", type: "uint256" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      name: "fundIssue",
      outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  // Inject the injected.js script into page context (only once)
  let injectedScriptLoaded = false;
  let injectedScriptPromise = null;

  // Inject ethers.js into page context
  async function ensureEthersInjected() {
    return new Promise((resolve, reject) => {
      // Check if chrome.runtime is available
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.getURL) {
        console.error("GitHub Bounty: chrome.runtime is not available");
        reject(new Error("Extension runtime not available. Please reload the extension."));
        return;
      }

      // Check if ethers.js script tag already exists
      const existingEthersScript = document.querySelector('script[src*="ethers.js"]');
      if (existingEthersScript) {
        console.log("GitHub Bounty: Ethers.js script tag already exists");
        // Give it time to load
        setTimeout(() => resolve(), 200);
        return;
      }

      // Inject ethers.js from extension
      const ethersScript = document.createElement("script");
      ethersScript.src = chrome.runtime.getURL("ethers.js");
      ethersScript.onload = () => {
        console.log("GitHub Bounty: Ethers.js loaded");
        // Give it a moment to initialize
        setTimeout(() => resolve(), 100);
      };
      ethersScript.onerror = () => {
        console.error("GitHub Bounty: Failed to load ethers.js");
        reject(new Error("Failed to load ethers.js"));
      };
      (document.head || document.documentElement).appendChild(ethersScript);
    });
  }

  function ensureInjectedScript() {
    if (injectedScriptLoaded) {
      return Promise.resolve();
    }

    if (injectedScriptPromise) {
      return injectedScriptPromise;
    }

    injectedScriptPromise = new Promise((resolve, reject) => {
      // Check if chrome.runtime is available
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.getURL) {
        console.error("GitHub Bounty: chrome.runtime is not available");
        injectedScriptPromise = null;
        reject(new Error("Extension runtime not available. Please reload the extension."));
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="injected.js"]');
      if (existingScript) {
        console.log("GitHub Bounty: Injected script tag already exists");
        injectedScriptLoaded = true;
        // Give it time to initialize
        setTimeout(() => resolve(), 200);
        return;
      }

      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("injected.js");
      script.onload = function () {
        console.log("GitHub Bounty: Injected script loaded successfully");
        // Don't remove the script - we need it to stay in the page context
        injectedScriptLoaded = true;
        // Give it time to initialize and set up event listeners
        setTimeout(() => resolve(), 300);
      };
      script.onerror = function () {
        console.error("GitHub Bounty: Failed to load injected script");
        injectedScriptPromise = null;
        reject(new Error("Failed to load injected script"));
      };
      (document.head || document.documentElement).appendChild(script);
    });

    return injectedScriptPromise;
  }

  // Check if MetaMask is installed (content script wrapper)
  async function isMetaMaskInstalled() {
    try {
      await ensureInjectedScript();
      console.log("GitHub Bounty: Checking if MetaMask is installed");

      return new Promise((resolve) => {
        const handler = (event) => {
          if (
            event.data &&
            event.data.type === "GITHUB_BOUNTY_METAMASK_CHECK"
          ) {
            console.log(
              "GitHub Bounty: MetaMask check result:",
              event.data.isInstalled
            );
            window.removeEventListener("message", handler);
            resolve(event.data.isInstalled);
          }
        };
        window.addEventListener("message", handler);

        // Send message to injected script
        console.log("GitHub Bounty: Sending CHECK_METAMASK message");
        window.postMessage(
          {
            type: "GITHUB_BOUNTY_CHECK_METAMASK",
          },
          "*"
        );

        // Timeout after 2 seconds
        setTimeout(() => {
          window.removeEventListener("message", handler);
          console.log("GitHub Bounty: MetaMask check timeout");
          resolve(false);
        }, 2000);
      });
    } catch (error) {
      console.error("GitHub Bounty: Error ensuring injected script:", error);
      return false;
    }
  }

  // Connect to MetaMask (content script wrapper)
  async function connectMetaMask() {
    console.log("GitHub Bounty: Connecting to MetaMask");
    try {
      // Ensure ethers.js is loaded first
      await ensureEthersInjected();
      await ensureInjectedScript();
      console.log("GitHub Bounty: Ensured injected script is loaded");

      // Give a bit more time for the script to be fully ready
      await new Promise(resolve => setTimeout(resolve, 100));

      return new Promise((resolve, reject) => {
        const handler = (event) => {
          // Only process messages from our extension
          if (!event.data || !event.data.type || !event.data.type.startsWith('GITHUB_BOUNTY_')) {
            return;
          }

          console.log("GitHub Bounty: Received message:", event.data);
          if (
            event.data &&
            event.data.type === "GITHUB_BOUNTY_METAMASK_CONNECTED"
          ) {
            console.log(
              "GitHub Bounty: MetaMask connected, account:",
              event.data.account
            );
            window.removeEventListener("message", handler);
            resolve(event.data.account);
          } else if (
            event.data &&
            event.data.type === "GITHUB_BOUNTY_METAMASK_ERROR"
          ) {
            console.error("GitHub Bounty: MetaMask error:", event.data.error);
            window.removeEventListener("message", handler);
            reject(new Error(event.data.error));
          }
        };
        window.addEventListener("message", handler);

        // Wait a bit more to ensure injected script is listening
        setTimeout(() => {
          // Send message to injected script
          console.log(
            "GitHub Bounty: Sending CONNECT_METAMASK message with chainId:",
            CONFIG.chainId
          );
          window.postMessage(
            {
              type: "GITHUB_BOUNTY_CONNECT_METAMASK",
              payload: {
                chainId: CONFIG.chainId,
              },
            },
            "*"
          );
        }, 300);

        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener("message", handler);
          reject(
            new Error(
              "Connection timeout - MetaMask popup may not have appeared"
            )
          );
        }, 30000);
      });
    } catch (error) {
      console.error("GitHub Bounty: Error ensuring injected script:", error);
      throw error;
    }
  }

  // Get token balance (using injected script)
  async function getTokenBalance(account) {
    await ensureEthersInjected();
    await ensureInjectedScript();

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === "GITHUB_BOUNTY_BALANCE_RESULT") {
          window.removeEventListener("message", handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve({
              balance: event.data.balance,
              decimals: event.data.decimals,
            });
          }
        }
      };
      window.addEventListener("message", handler);

      // Send message to injected script
      window.postMessage(
        {
          type: "GITHUB_BOUNTY_GET_BALANCE",
          payload: {
            account: account,
            tokenAddress: CONFIG.tokenAddress,
          },
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Balance fetch timeout"));
      }, 30000);
    });
  }

  // Check token allowance (using injected script)
  async function checkTokenAllowance(account, amount) {
    await ensureEthersInjected();
    await ensureInjectedScript();

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === "GITHUB_BOUNTY_ALLOWANCE_RESULT") {
          window.removeEventListener("message", handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve({
              allowance: event.data.allowance,
              decimals: event.data.decimals,
              isApproved: event.data.isApproved,
            });
          }
        }
      };
      window.addEventListener("message", handler);

      // Send message to injected script
      window.postMessage(
        {
          type: "GITHUB_BOUNTY_CHECK_ALLOWANCE",
          payload: {
            account: account,
            tokenAddress: CONFIG.tokenAddress,
            spenderAddress: CONFIG.rewardDistributorAddress,
            amount: amount,
          },
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Allowance check timeout"));
      }, 30000);
    });
  }

  // Approve tokens for RewardDistributor (using injected script)
  async function approveTokens(account, amount) {
    await ensureEthersInjected();
    await ensureInjectedScript();

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === "GITHUB_BOUNTY_APPROVE_RESULT") {
          window.removeEventListener("message", handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve({
              success: true,
              txHash: event.data.txHash,
              receipt: event.data.receipt,
            });
          }
        }
      };
      window.addEventListener("message", handler);

      // Send message to injected script
      window.postMessage(
        {
          type: "GITHUB_BOUNTY_APPROVE_TOKENS",
          payload: {
            account: account,
            amount: amount,
            tokenAddress: CONFIG.tokenAddress,
            spenderAddress: CONFIG.rewardDistributorAddress,
          },
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Approve transaction timeout"));
      }, 120000); // 2 minutes for transaction
    });
  }

  // Fund issue using RewardDistributor contract (using injected script)
  async function fundIssue(account, owner, repo, issueNumber, amount) {
    await ensureEthersInjected();
    await ensureInjectedScript();

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === "GITHUB_BOUNTY_FUND_RESULT") {
          window.removeEventListener("message", handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve({
              success: true,
              txHash: event.data.txHash,
              receipt: event.data.receipt,
              issueId: event.data.issueId,
            });
          }
        }
      };
      window.addEventListener("message", handler);

      // Send message to injected script
      window.postMessage(
        {
          type: "GITHUB_BOUNTY_FUND_ISSUE",
          payload: {
            account: account,
            owner: owner,
            repo: repo,
            issueNumber: issueNumber,
            amount: amount,
            rewardDistributorAddress: CONFIG.rewardDistributorAddress,
            tokenAddress: CONFIG.tokenAddress,
          },
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Fund issue transaction timeout"));
      }, 120000); // 2 minutes for transaction
    });
  }

  // Create and show modal
  function showSponsorModal(issueData) {
    // Remove existing modal if any
    const existingModal = document.getElementById("github-bounty-modal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.id = "github-bounty-modal";
    modal.className = "github-bounty-modal-overlay";

    modal.innerHTML = `
      <div class="github-bounty-modal-content">
        <div class="github-bounty-modal-header">
          <h3>Sponsor Issue</h3>
          <button class="github-bounty-modal-close" id="modal-close-btn">&times;</button>
        </div>
        <div class="github-bounty-modal-body">
          <p class="github-bounty-modal-info">
            <strong>Repository:</strong> ${issueData.owner}/${issueData.repo}<br>
            <strong>Issue:</strong> #${issueData.issueNumber}
          </p>
          <div class="github-bounty-form-group">
            <label for="token-amount">Token Amount:</label>
            <input 
              type="number" 
              id="token-amount" 
              style="background-color: #ffffff !important; color:black;"
              class="github-bounty-input" 
              placeholder="0.0" 
              step="0.000000000000000001"
              min="0"
            />
          </div>
          <div id="token-balance" class="github-bounty-balance"></div>
          <div id="modal-status" class="github-bounty-status"></div>
        </div>
        <div class="github-bounty-modal-footer">
          <button id="modal-cancel-btn" class="github-bounty-btn-secondary">Cancel</button>
          <button id="modal-connect-btn" class="github-bounty-btn-primary">Connect Wallet</button>
          <button id="modal-approve-btn" class="github-bounty-btn-primary" style="display: none;">Approve Tokens</button>
          <button id="modal-fund-btn" class="github-bounty-btn-primary" style="display: none;">Fund Issue</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Modal event handlers
    const closeBtn = modal.querySelector("#modal-close-btn");
    const cancelBtn = modal.querySelector("#modal-cancel-btn");
    const connectBtn = modal.querySelector("#modal-connect-btn");
    const approveBtn = modal.querySelector("#modal-approve-btn");
    const fundBtn = modal.querySelector("#modal-fund-btn");
    const amountInput = modal.querySelector("#token-amount");
    const statusEl = modal.querySelector("#modal-status");
    const balanceEl = modal.querySelector("#token-balance");

    let connectedAccount = null;
    let tokensApproved = false;

    // Close modal
    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // Connect wallet
    connectBtn.addEventListener("click", async () => {
      try {
        connectBtn.disabled = true;
        connectBtn.textContent = "Connecting...";
        statusEl.textContent = "Connecting to MetaMask...";
        statusEl.className = "github-bounty-status github-bounty-status-info";
        statusEl.style.display = "block";

        connectedAccount = await connectMetaMask();

        statusEl.textContent = `Connected: ${connectedAccount.substring(
          0,
          6
        )}...${connectedAccount.substring(38)}`;
        statusEl.className =
          "github-bounty-status github-bounty-status-success";

        // Get and display balance
        try {
          // const { balance, decimals } = await getTokenBalance(connectedAccount);
          // console.log("Fetched balance:", balance, "Decimals:", decimals);
          // // Format balance (balance is a string, decimals is a number)
          // const balanceBigInt = BigInt(balance);
          // const divisor = BigInt(10 ** decimals);
          // const wholePart = balanceBigInt / divisor;
          // const fractionalPart = balanceBigInt % divisor;
          // const balanceFormatted =
          //   fractionalPart === 0n
          //     ? wholePart.toString()
          //     : `${wholePart}.${fractionalPart
          //         .toString()
          //         .padStart(decimals, "0")
          //         .replace(/0+$/, "")}`;
          // balanceEl.textContent = `Balance: ${balanceFormatted} tokens`;
          // balanceEl.style.display = "block";
        } catch (err) {
          console.error("Error fetching balance:", err);
          balanceEl.textContent = "Could not fetch balance";
          balanceEl.style.display = "block";
        }

        // Check if tokens are already approved
        const amount = parseFloat(amountInput.value);
        if (amount && amount > 0) {
          try {
            const { isApproved } = await checkTokenAllowance(connectedAccount, amount);
            tokensApproved = isApproved;
            if (isApproved) {
              approveBtn.style.display = "none";
              fundBtn.style.display = "inline-block";
            } else {
              approveBtn.style.display = "inline-block";
              fundBtn.style.display = "none";
            }
          } catch (err) {
            console.error("Error checking allowance:", err);
            // Default to showing approve button if check fails
            approveBtn.style.display = "inline-block";
            fundBtn.style.display = "none";
          }
        } else {
          // No amount entered yet, show approve button
          approveBtn.style.display = "inline-block";
          fundBtn.style.display = "none";
        }

        connectBtn.style.display = "none";
      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        connectBtn.disabled = false;
        connectBtn.textContent = "Connect Wallet";
      }
    });

    // Approve tokens
    approveBtn.addEventListener("click", async () => {
      const amount = parseFloat(amountInput.value);

      if (!amount || amount <= 0) {
        statusEl.textContent = "Please enter a valid amount";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        return;
      }

      if (!connectedAccount) {
        statusEl.textContent = "Please connect your wallet first";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        return;
      }

      try {
        approveBtn.disabled = true;
        approveBtn.textContent = "Approving...";
        statusEl.textContent = "Approving tokens...";
        statusEl.className = "github-bounty-status github-bounty-status-info";
        statusEl.style.display = "block";
        console.log("GitHub Bounty: Approving tokens", amount);

        const result = await approveTokens(connectedAccount, amount);

        statusEl.innerHTML = `Tokens approved! Transaction: <a href="https://sepolia.basescan.org/tx/${
          result.txHash
        }" target="_blank">${result.txHash.substring(0, 10)}...</a>`;
        statusEl.className =
          "github-bounty-status github-bounty-status-success";

        // Wait for transaction to be confirmed and re-check allowance
        statusEl.textContent = "Waiting for approval confirmation...";
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for confirmation
        
        // Re-check allowance to confirm
        try {
          const { isApproved } = await checkTokenAllowance(connectedAccount, amount);
          tokensApproved = isApproved;
          if (isApproved) {
            statusEl.innerHTML = `Tokens approved! Transaction: <a href="https://sepolia.basescan.org/tx/${
              result.txHash
            }" target="_blank">${result.txHash.substring(0, 10)}...</a>`;
            approveBtn.style.display = "none";
            fundBtn.style.display = "inline-block";
          } else {
            statusEl.textContent = "Approval pending. Please wait a moment and try again.";
            tokensApproved = false;
            approveBtn.style.display = "inline-block";
            fundBtn.style.display = "none";
          }
        } catch (err) {
          console.error("Error re-checking allowance:", err);
          // Assume approved if we can't check
          tokensApproved = true;
          approveBtn.style.display = "none";
          fundBtn.style.display = "inline-block";
        }
        
        approveBtn.disabled = false;
      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        approveBtn.disabled = false;
        approveBtn.textContent = "Approve Tokens";
      }
    });

    // Re-check allowance when amount changes
    amountInput.addEventListener("input", async () => {
      if (connectedAccount) {
        const amount = parseFloat(amountInput.value);
        if (amount && amount > 0) {
          try {
            const { isApproved } = await checkTokenAllowance(connectedAccount, amount);
            tokensApproved = isApproved;
            if (isApproved) {
              approveBtn.style.display = "none";
              fundBtn.style.display = "inline-block";
            } else {
              approveBtn.style.display = "inline-block";
              fundBtn.style.display = "none";
            }
          } catch (err) {
            console.error("Error checking allowance:", err);
          }
        }
      }
    });

    // Fund issue
    fundBtn.addEventListener("click", async () => {
      const amount = parseFloat(amountInput.value);

      if (!amount || amount <= 0) {
        statusEl.textContent = "Please enter a valid amount";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        return;
      }

      if (!connectedAccount) {
        statusEl.textContent = "Please connect your wallet first";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        return;
      }

      if (!tokensApproved) {
        statusEl.textContent = "Please approve tokens first";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        return;
      }

      if (issueData.issueNumber === "N/A") {
        statusEl.textContent = "Please navigate to a specific issue page";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        return;
      }

      try {
        fundBtn.disabled = true;
        fundBtn.textContent = "Funding...";
        statusEl.textContent = "Funding issue...";
        statusEl.className = "github-bounty-status github-bounty-status-info";
        statusEl.style.display = "block";

        const result = await fundIssue(
          connectedAccount,
          issueData.owner,
          issueData.repo,
          parseInt(issueData.issueNumber),
          amount
        );

        statusEl.innerHTML = `Issue funded successfully! Transaction: <a href="https://sepolia.basescan.org/tx/${
          result.txHash
        }" target="_blank">${result.txHash.substring(0, 10)}...</a>`;
        statusEl.className =
          "github-bounty-status github-bounty-status-success";

        fundBtn.textContent = "Funded!";

        // Close modal after 3 seconds
        setTimeout(() => {
          closeModal();
        }, 3000);
      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        fundBtn.disabled = false;
        fundBtn.textContent = "Fund Issue";
      }
    });
  }

  // Handle Sponsor button click
  function handleSponsorClick() {
    // Extract issue information from the page
    const issueUrl = window.location.href;
    const issueMatch = issueUrl.match(
      /github\.com\/([^\/]+)\/([^\/]+)\/issues\/?(\d*)/
    );
    
    let issueData;
    if (issueMatch) {
      const [, owner, repo, issueNumber] = issueMatch;
      issueData = {
        owner,
        repo,
        issueNumber: issueNumber || "N/A",
        url: issueUrl,
      };
    } else {
      // If we're on the issues list page, extract from URL
      const listMatch = issueUrl.match(
        /github\.com\/([^\/]+)\/([^\/]+)\/issues/
      );
      if (listMatch) {
        const [, owner, repo] = listMatch;
        issueData = {
          owner,
          repo,
          issueNumber: "N/A",
          url: issueUrl,
        };
      } else {
        issueData = {
          owner: "Unknown",
          repo: "Unknown",
          issueNumber: "N/A",
          url: issueUrl,
        };
      }
    }

    console.log("GitHub Bounty: Sponsor clicked", issueData);

    // Show modal
    showSponsorModal(issueData);
  }
  function copyButtonStyle(sourceBtn, targetBtn) {
    if (!sourceBtn || !targetBtn) return;

    // classes
    targetBtn.className = sourceBtn.className || "btn";

    // copie les attributs data- et style éventuellement utilisés par GitHub
    for (const attr of sourceBtn.attributes) {
      const name = attr.name;
      if (name === "id" || name === "type") continue;
      if (name === "class") continue;

      // On copie tout ce qui est data- ou style (et éventuellement d'autres si besoin)
      if (name.startsWith("data-") || name === "style") {
        targetBtn.setAttribute(name, attr.value);
      }
    }

    // On s’assure qu’il a au moins la classe btn
    if (!targetBtn.classList.contains("btn")) {
      targetBtn.classList.add("btn");
    }
  }

  // Ajoute le bouton "Claim reward" à gauche de "Reopen issue"
  function addClaimButton() {
    // pas de doublon
    if (document.getElementById("github-bounty-claim-btn")) {
      return;
    }

    // seulement sur une page d'issue
    if (!/\/issues\/\d+/.test(location.pathname)) {
      return;
    }

    // on cherche le bouton "Reopen issue" (présent uniquement quand l'issue est close)
    const actionButtons = document.querySelectorAll(
      "form button, form summary, button, summary"
    );

    let reopenButton = null;

    for (const btn of actionButtons) {
      const text = (btn.textContent || "").trim().toLowerCase();
      if (text === "reopen issue") {
        reopenButton = btn;
        break;
      }
    }

    if (!reopenButton) {
      console.log(
        "GitHub Bounty: Reopen issue button not found -> issue not closed, no Claim button"
      );
      return;
    }

    // création du bouton Claim
    const claimButton = document.createElement("button");
    claimButton.id = "github-bounty-claim-btn";
    claimButton.type = "button";
    claimButton.textContent = "Claim reward";

    // copie le style du bouton Reopen issue
    copyButtonStyle(reopenButton, claimButton);

    // un peu d'espace entre Claim et le groupe Reopen+menu
    claimButton.style.marginRight = "8px";

    claimButton.addEventListener("click", handleClaimClick);

    // === IMPORTANT : insertion avant la BtnGroup, pas dans la BtnGroup ===
    const btnGroup =
      reopenButton.closest(".BtnGroup") || reopenButton.parentElement;
    const container = btnGroup.parentElement;

    container.insertBefore(claimButton, btnGroup);

    console.log("GitHub Bounty: Claim button added successfully");
  }

  // Retourne true si l'utilisateur courant a participé au PR qui a fermé l'issue
  async function isCurrentUserContributor() {
    const userMeta = document.querySelector('meta[name="user-login"]');
    const currentUser = userMeta ? userMeta.getAttribute("content") : null;
    if (!currentUser) {
      console.log("GitHub Bounty: No logged-in user detected");
      return false;
    }

    const login = currentUser.trim().toLowerCase();
    console.log("GitHub Bounty: Checking if user is contributor to closing PR:", login);

    // Find PRs that closed this issue
    const closingPRs = findClosingPRs();
    console.log("GitHub Bounty: Found closing PRs:", closingPRs);
    
    // If we found PRs, check if user is a contributor
    if (closingPRs.length > 0) {
      // Check if current user is a contributor to any of the closing PRs
      for (const prInfo of closingPRs) {
        console.log("GitHub Bounty: Checking PR:", prInfo);
        
        // Check PR author
        if (prInfo.author && prInfo.author.toLowerCase() === login) {
          console.log("GitHub Bounty: Current user is PR author", login);
          return true;
        }

        // Check PR contributors (committers, reviewers)
        if (prInfo.contributors && prInfo.contributors.length > 0) {
          console.log("GitHub Bounty: PR contributors:", prInfo.contributors);
          if (prInfo.contributors.some(c => c.toLowerCase() === login)) {
            console.log("GitHub Bounty: Current user is PR contributor", login);
            return true;
          }
        }

        // If we have PR URL but no author/contributors, try to fetch more details
        if (prInfo.url && (!prInfo.author || prInfo.contributors.length === 0)) {
          console.log("GitHub Bounty: PR data incomplete, trying to fetch from API");
          const prData = await fetchPRData(prInfo.url);
          if (prData) {
            if (prData.author && prData.author.toLowerCase() === login) {
              console.log("GitHub Bounty: Current user is PR author (from API)", login);
              return true;
            }
            if (prData.contributors && prData.contributors.some(c => c.toLowerCase() === login)) {
              console.log("GitHub Bounty: Current user is PR contributor (from API)", login);
              return true;
            }
          }
        }
      }
    }

    console.log(
      "GitHub Bounty: Current user is not a contributor to closing PRs",
      login,
      "PRs:",
      closingPRs
    );

    return false;
  }

  // Find PRs that closed this issue from the DOM
  function findClosingPRs() {
    const prs = [];
    
    // Look for timeline events that mention PRs closing the issue
    const timelineEvents = document.querySelectorAll(
      ".TimelineItem, .js-timeline-item, [data-testid='timeline-item'], .discussion-item"
    );

    for (const event of timelineEvents) {
      const text = (event.textContent || "").toLowerCase();
      
      // Find PR links first - they might be in any timeline event
      const prLinks = event.querySelectorAll('a[href*="/pull/"]');
      
      // If we found PR links, check if this is a closing event
      if (prLinks.length > 0) {
        // Look for "closed by", "merged", "fixes", "closes" messages with PR links
        const isClosingEvent = (
          text.includes("closed by") ||
          text.includes("closed") ||
          text.includes("merged") ||
          text.includes("merges") ||
          (text.includes("fixes") && text.includes("#")) ||
          (text.includes("closes") && text.includes("#")) ||
          (text.includes("resolves") && text.includes("#"))
        );
        
        // Also check if the issue is closed and this PR is mentioned
        const issueState = document.querySelector('[data-testid="issue-state"]')?.textContent?.toLowerCase() || "";
        const isIssueClosed = issueState.includes("closed");
        
        if (isClosingEvent || isIssueClosed) {
          // Find PR links in this event
          for (const link of prLinks) {
            const href = link.getAttribute("href");
            if (href && /\/pull\/\d+/.test(href)) {
              const prMatch = href.match(/\/pull\/(\d+)/);
              if (prMatch) {
                const prNumber = prMatch[1];
                
                // Try to find PR author and contributors in the event
                let author = null;
                const contributors = [];
                
                // Method 1: Look for author in various places in the event
                const authorSelectors = [
                  ".author",
                  "[data-testid='author-name']",
                  ".Link--primary",
                  ".timeline-comment-header-text .author",
                  "[data-hovercard-type='user']",
                  ".opened-by .author",
                  ".TimelineItem-body .author"
                ];
                
                for (const selector of authorSelectors) {
                  const authorNodes = event.querySelectorAll(selector);
                  for (const authorNode of authorNodes) {
                    const text = authorNode.textContent?.trim();
                    const hovercardUrl = authorNode.getAttribute("data-hovercard-url");
                    const ariaLabel = authorNode.getAttribute("aria-label");
                    
                    let username = null;
                    if (hovercardUrl) {
                      const match = hovercardUrl.match(/\/users\/([^\/]+)/);
                      if (match) username = match[1];
                    } else if (text) {
                      // Remove @ symbol if present
                      username = text.replace(/^@/, "").trim();
                    } else if (ariaLabel) {
                      username = ariaLabel.replace(/^@/, "").trim();
                    }
                    
                    if (username && !author) {
                      author = username;
                    } else if (username && username !== author && !contributors.includes(username)) {
                      contributors.push(username);
                    }
                  }
                }

                // Method 2: Look for user links and extract usernames
                const userLinks = event.querySelectorAll('a[data-hovercard-type="user"], a[href*="/"]');
                for (const userLink of userLinks) {
                  const href = userLink.getAttribute("href");
                  const hovercardUrl = userLink.getAttribute("data-hovercard-url");
                  
                  let username = null;
                  if (hovercardUrl) {
                    const match = hovercardUrl.match(/\/users\/([^\/]+)/);
                    if (match) username = match[1];
                  } else if (href && href.includes("/")) {
                    // Extract from href like /username or /users/username
                    const match = href.match(/\/(?:users\/)?([^\/]+)(?:\/|$)/);
                    if (match && !match[1].match(/^(pull|issues|pulls|settings|orgs)/)) {
                      username = match[1];
                    }
                  }
                  
                  if (username && !author) {
                    author = username;
                  } else if (username && username !== author && !contributors.includes(username)) {
                    contributors.push(username);
                  }
                }

                // Method 3: Look for avatars and extract from alt/title attributes
                const avatarNodes = event.querySelectorAll(
                  ".AvatarStack-item img, [data-hovercard-type='user'] img, .avatar img, img.avatar"
                );
                for (const node of avatarNodes) {
                  const alt = node.getAttribute("alt") || "";
                  const title = node.getAttribute("title") || "";
                  const name = alt.replace(/^@/, "").trim() || title.replace(/^@/, "").trim();
                  
                  if (name) {
                    if (!author) {
                      author = name;
                    } else if (name !== author && !contributors.includes(name)) {
                      contributors.push(name);
                    }
                  }
                }

                // Method 4: Look in the PR link itself or nearby text
                const linkParent = link.closest(".TimelineItem-body, .discussion-item, .Box");
                if (linkParent) {
                  const parentText = linkParent.textContent || "";
                  // Look for patterns like "by @username" or "opened by username"
                  const byMatch = parentText.match(/(?:by|opened by|merged by)\s+@?([a-zA-Z0-9_-]+)/i);
                  if (byMatch && byMatch[1]) {
                    const username = byMatch[1].toLowerCase();
                    if (!author) {
                      author = username;
                    } else if (username !== author && !contributors.includes(username)) {
                      contributors.push(username);
                    }
                  }
                }
                
                console.log("GitHub Bounty: Extracted PR info from DOM:", {
                  prNumber,
                  author,
                  contributors,
                  eventText: (event.textContent || "").substring(0, 200)
                });

                prs.push({
                  number: prNumber,
                  url: href.startsWith("http") ? href : `https://github.com${href}`,
                  author: author,
                  contributors: contributors,
                });
              }
            }
          }
        }
      }
    }

    // Also check for linked PRs in the sidebar or issue header
    const linkedPRs = document.querySelectorAll('a[href*="/pull/"]');
    for (const link of linkedPRs) {
      const href = link.getAttribute("href");
      if (href && /\/pull\/\d+/.test(href)) {
        const prMatch = href.match(/\/pull\/(\d+)/);
        if (prMatch) {
          const prNumber = prMatch[1];
          
          // Check if this PR is already in our list
          if (!prs.some(p => p.number === prNumber)) {
            // Try to find author from link context
            let author = null;
            const parent = link.closest(".Box-row, .js-navigation-item, .discussion-sidebar-item");
            if (parent) {
              const authorNode = parent.querySelector(".author, [data-hovercard-type='user']");
              if (authorNode) {
                author = authorNode.textContent?.trim() || 
                        authorNode.getAttribute("data-hovercard-url")?.match(/\/users\/([^\/]+)/)?.[1];
              }
            }

            prs.push({
              number: prNumber,
              url: href.startsWith("http") ? href : `https://github.com${href}`,
              author: author,
              contributors: [],
            });
          }
        }
      }
    }

    return prs;
  }

  // Fetch PR data from GitHub API via background script
  async function fetchPRData(prUrl) {
    try {
      // Extract owner, repo, and PR number from URL
      const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
      if (!match) {
        console.error("GitHub Bounty: Invalid PR URL:", prUrl);
        return null;
      }

      const [, owner, repo, prNumber] = match;

      // Request PR data from background script
      return new Promise((resolve) => {
        if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) {
          console.error("GitHub Bounty: chrome.runtime not available");
          resolve(null);
          return;
        }

        let resolved = false;
        
        // Timeout after 10 seconds
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.log("GitHub Bounty: PR data fetch timeout");
            resolve(null);
          }
        }, 10000);

        try {
          chrome.runtime.sendMessage(
            {
              type: "FETCH_PR_DATA",
              owner,
              repo,
              prNumber,
            },
            (response) => {
              if (resolved) return; // Already resolved by timeout
              
              clearTimeout(timeout);
              
              if (chrome.runtime.lastError) {
                console.error("GitHub Bounty: Error fetching PR data:", chrome.runtime.lastError.message);
                resolved = true;
                resolve(null);
                return;
              }

              if (response && response.ok && response.prData) {
                console.log("GitHub Bounty: Fetched PR data:", response.prData);
                resolved = true;
                resolve(response.prData);
              } else {
                console.log("GitHub Bounty: Failed to fetch PR data:", response?.error || "Unknown error");
                resolved = true;
                resolve(null);
              }
            }
          );
        } catch (error) {
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            console.error("GitHub Bounty: Error sending message:", error);
            resolve(null);
          }
        }
      });
    } catch (error) {
      console.error("GitHub Bounty: Error in fetchPRData:", error);
      return null;
    }
  }

  function handleClaimClick() {
    const issueUrl = window.location.href;
    const match = issueUrl.match(
      /github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/
    );

    if (!match) {
      console.error("GitHub Bounty: Unable to parse issue URL", issueUrl);
      return;
    }

    const [, owner, repo, issueNumber] = match;

    const issueData = {
      owner,
      repo,
      issueNumber,
      url: issueUrl,
    };

    console.log("GitHub Bounty: Claim reward clicked", issueData);

    // Show claim modal
    showClaimModal(issueData);
  }

  // Show claim reward modal
  function showClaimModal(issueData) {
    // Remove existing modal if any
    const existingModal = document.getElementById("github-bounty-claim-modal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.id = "github-bounty-claim-modal";
    modal.className = "github-bounty-modal-overlay";

    modal.innerHTML = `
      <div class="github-bounty-modal-content">
        <div class="github-bounty-modal-header">
          <h3>Claim Reward</h3>
          <button class="github-bounty-modal-close" id="claim-modal-close-btn">&times;</button>
        </div>
        <div class="github-bounty-modal-body">
          <p class="github-bounty-modal-info">
            <strong>Repository:</strong> ${issueData.owner}/${issueData.repo}<br>
            <strong>Issue:</strong> #${issueData.issueNumber}
          </p>
          <div id="claim-pending-reward" class="github-bounty-balance"></div>
          <div id="claim-status" class="github-bounty-status"></div>
        </div>
        <div class="github-bounty-modal-footer">
          <button id="claim-modal-cancel-btn" class="github-bounty-btn-secondary">Cancel</button>
          <button id="claim-modal-connect-btn" class="github-bounty-btn-primary">Connect Wallet</button>
          <button id="claim-modal-claim-btn" class="github-bounty-btn-primary" style="display: none;">Claim Reward</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Modal event handlers
    const closeBtn = modal.querySelector("#claim-modal-close-btn");
    const cancelBtn = modal.querySelector("#claim-modal-cancel-btn");
    const connectBtn = modal.querySelector("#claim-modal-connect-btn");
    const claimBtn = modal.querySelector("#claim-modal-claim-btn");
    const statusEl = modal.querySelector("#claim-status");
    const pendingRewardEl = modal.querySelector("#claim-pending-reward");

    let connectedAccount = null;

    // Close modal
    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // Connect wallet
    connectBtn.addEventListener("click", async () => {
      try {
        connectBtn.disabled = true;
        connectBtn.textContent = "Connecting...";
        statusEl.textContent = "Connecting to MetaMask...";
        statusEl.className = "github-bounty-status github-bounty-status-info";
        statusEl.style.display = "block";

        connectedAccount = await connectMetaMask();

        statusEl.textContent = `Connected: ${connectedAccount.substring(
          0,
          6
        )}...${connectedAccount.substring(38)}`;
        statusEl.className =
          "github-bounty-status github-bounty-status-success";

        // Check pending reward
        try {
          const pendingReward = await getPendingReward(
            connectedAccount,
            issueData.owner,
            issueData.repo,
            parseInt(issueData.issueNumber)
          );
          if (pendingReward && pendingReward.amount > 0) {
            pendingRewardEl.textContent = `Pending Reward: ${pendingReward.formatted} tokens`;
            pendingRewardEl.style.display = "block";
            claimBtn.style.display = "inline-block";
          } else {
            pendingRewardEl.textContent = "No pending reward available";
            pendingRewardEl.style.display = "block";
            claimBtn.style.display = "none";
          }
        } catch (err) {
          console.error("Error fetching pending reward:", err);
          pendingRewardEl.textContent = "Could not fetch pending reward";
          pendingRewardEl.style.display = "block";
          // Still show claim button in case of error
          claimBtn.style.display = "inline-block";
        }

        connectBtn.style.display = "none";
      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        connectBtn.disabled = false;
        connectBtn.textContent = "Connect Wallet";
      }
    });

    // Claim reward
    claimBtn.addEventListener("click", async () => {
      if (!connectedAccount) {
        statusEl.textContent = "Please connect your wallet first";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        return;
      }

      try {
        claimBtn.disabled = true;
        claimBtn.textContent = "Claiming...";
        statusEl.textContent = "Claiming reward...";
        statusEl.className = "github-bounty-status github-bounty-status-info";
        statusEl.style.display = "block";

        const result = await claimReward(
          connectedAccount,
          issueData.owner,
          issueData.repo,
          parseInt(issueData.issueNumber)
        );

        statusEl.innerHTML = `Reward claimed successfully! Transaction: <a href="https://sepolia.basescan.org/tx/${
          result.txHash
        }" target="_blank">${result.txHash.substring(0, 10)}...</a>`;
        statusEl.className =
          "github-bounty-status github-bounty-status-success";

        claimBtn.textContent = "Claimed!";

        // Close modal after 3 seconds
        setTimeout(() => {
          closeModal();
        }, 3000);
      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        claimBtn.disabled = false;
        claimBtn.textContent = "Claim Reward";
      }
    });
  }

  // Get pending reward for a contributor
  async function getPendingReward(account, owner, repo, issueNumber) {
    await ensureEthersInjected();
    await ensureInjectedScript();

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === "GITHUB_BOUNTY_PENDING_REWARD_RESULT") {
          window.removeEventListener("message", handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve({
              amount: event.data.amount,
              formatted: event.data.formatted,
            });
          }
        }
      };
      window.addEventListener("message", handler);

      window.postMessage(
        {
          type: "GITHUB_BOUNTY_GET_PENDING_REWARD",
          payload: {
            account: account,
            owner: owner,
            repo: repo,
            issueNumber: issueNumber,
            rewardDistributorAddress: CONFIG.rewardDistributorAddress,
          },
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Pending reward fetch timeout"));
      }, 30000);
    });
  }

  // Claim reward using RewardDistributor contract
  async function claimReward(account, owner, repo, issueNumber) {
    await ensureEthersInjected();
    await ensureInjectedScript();

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === "GITHUB_BOUNTY_CLAIM_RESULT") {
          window.removeEventListener("message", handler);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve({
              success: true,
              txHash: event.data.txHash,
              receipt: event.data.receipt,
            });
          }
        }
      };
      window.addEventListener("message", handler);

      window.postMessage(
        {
          type: "GITHUB_BOUNTY_CLAIM_REWARD",
          payload: {
            account: account,
            owner: owner,
            repo: repo,
            issueNumber: issueNumber,
            rewardDistributorAddress: CONFIG.rewardDistributorAddress,
          },
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Claim reward transaction timeout"));
      }, 120000); // 2 minutes for transaction
    });
  }

  // Wait for page to load and observe changes (GitHub uses dynamic content)
  function init() {
    console.log("GitHub Bounty: Initializing...");
    
    // Try immediately

    addSponsorButton();

    // Bouton Claim uniquement sur une page d'issue
    if (isIssueDetailPage()) {
      addClaimButton();
    }

    const observer = new MutationObserver(function () {
      if (!document.getElementById("github-bounty-sponsor-btn")) {
        addSponsorButton();
      }
      if (
        isIssueDetailPage() &&
        !document.getElementById("github-bounty-claim-btn")
      ) {
        addClaimButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Plusieurs essais différés
    setTimeout(() => {
      addSponsorButton();
      if (isIssueDetailPage()) addClaimButton();
    }, 500);
    setTimeout(() => {
      addSponsorButton();
      if (isIssueDetailPage()) addClaimButton();
    }, 1000);
    setTimeout(() => {
      addSponsorButton();
      if (isIssueDetailPage()) addClaimButton();
    }, 2000);
    setTimeout(() => {
      addSponsorButton();
      if (isIssueDetailPage()) addClaimButton();
    }, 3000);
    setTimeout(() => {
      addSponsorButton();
      if (isIssueDetailPage()) addClaimButton();
    }, 5000);
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // If already loaded, wait a bit for GitHub's JS to finish
    setTimeout(init, 100);
  }

  // Also listen for navigation events (GitHub uses SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log("GitHub Bounty: Page navigated, re-initializing");
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });

  // Check if issue is open
  function isIssueOpen() {
    // Check for "Closed" state indicator
    const stateElement = document.querySelector('[data-testid="issue-state"]');
    if (stateElement) {
      const stateText = (stateElement.textContent || "").toLowerCase();
      if (stateText.includes("closed")) {
        return false;
      }
      if (stateText.includes("open")) {
        return true;
      }
    }

    // Check for state classes
    const closedState = document.querySelector('.State--closed');
    if (closedState) {
      return false;
    }

    const openState = document.querySelector('.State--open');
    if (openState) {
      return true;
    }

    // Check for buttons
    const allButtons = document.querySelectorAll('button, [role="button"]');
    for (const btn of allButtons) {
      const text = (btn.textContent || "").trim().toLowerCase();
      if (text === "reopen issue" || text === "reopen") {
        return false; // Issue is closed
      }
      if (text === "close issue" || text === "close") {
        return true; // Issue is open
      }
    }

    // Check for title attributes
    const elementsWithTitle = document.querySelectorAll('[title*="Closed"], [title*="closed"]');
    if (elementsWithTitle.length > 0) {
      return false;
    }

    const elementsWithOpenTitle = document.querySelectorAll('[title*="Open"], [title*="open"]');
    if (elementsWithOpenTitle.length > 0) {
      return true;
    }

    // Default to open if we can't determine
    return true;
  }
})();
function isIssueDetailPage() {
  return /\/issues\/\d+/.test(location.pathname);
}
