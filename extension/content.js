// Content script to inject Sponsor button on GitHub issue pages

(function () {
  "use strict";

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
    sponsorButton.style.marginLeft = "8px";

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
      newIssueButton.parentNode.appendChild(sponsorButton);
    }

    console.log(
      "GitHub Bounty: Sponsor button added successfully next to New issue button!"
    );
  }

  // Contract configuration
  const CONFIG = {
    // Token contract address (ERC20 token)
    tokenAddress: "0x4700A50d858Cb281847ca4Ee0938F80DEfB3F1dd",
    // Contract address to send tokens to (ReserveManager or proxy)
    contractAddress: "0x073671aE6EAa2468c203fDE3a79dEe0836adF032",
    // Chain ID for Ethereum Sepolia testnet
    chainId: "0xaa36a7", // 11155111 in hex
    chainName: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY", // Optional, MetaMask will use its own
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

  // Inject the injected.js script into page context (only once)
  let injectedScriptLoaded = false;
  let injectedScriptPromise = null;

  function ensureInjectedScript() {
    if (injectedScriptLoaded) {
      return Promise.resolve();
    }

    if (injectedScriptPromise) {
      return injectedScriptPromise;
    }

    injectedScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("injected.js");
      script.onload = function () {
        console.log("GitHub Bounty: Injected script loaded successfully");
        this.remove();
        injectedScriptLoaded = true;
        // Give it a moment to initialize
        setTimeout(() => resolve(), 100);
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
      await ensureInjectedScript();
      console.log("GitHub Bounty: Ensured injected script is loaded");

      return new Promise((resolve, reject) => {
        const handler = (event) => {
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

  // Send tokens to contract (using injected script)
  async function sendTokens(account, amount) {
    await ensureInjectedScript();

    return new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.data && event.data.type === "GITHUB_BOUNTY_SEND_RESULT") {
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
          type: "GITHUB_BOUNTY_SEND_TOKENS",
          payload: {
            account: account,
            amount: amount,
            tokenAddress: CONFIG.tokenAddress,
            contractAddress: CONFIG.contractAddress,
          },
        },
        "*"
      );

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Send transaction timeout"));
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
          <button id="modal-send-btn" class="github-bounty-btn-primary" style="display: none;">Send Tokens</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Modal event handlers
    const closeBtn = modal.querySelector("#modal-close-btn");
    const cancelBtn = modal.querySelector("#modal-cancel-btn");
    const connectBtn = modal.querySelector("#modal-connect-btn");
    const sendBtn = modal.querySelector("#modal-send-btn");
    const amountInput = modal.querySelector("#token-amount");
    const statusEl = modal.querySelector("#modal-status");
    const balanceEl = modal.querySelector("#token-balance");

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

        // Get and display balance
        try {
          const { balance, decimals } = await getTokenBalance(connectedAccount);
          // Format balance (balance is a string, decimals is a number)
          const balanceBigInt = BigInt(balance);
          const divisor = BigInt(10 ** decimals);
          const wholePart = balanceBigInt / divisor;
          const fractionalPart = balanceBigInt % divisor;
          const balanceFormatted =
            fractionalPart === 0n
              ? wholePart.toString()
              : `${wholePart}.${fractionalPart
                  .toString()
                  .padStart(decimals, "0")
                  .replace(/0+$/, "")}`;
          balanceEl.textContent = `Balance: ${balanceFormatted} tokens`;
          balanceEl.style.display = "block";
        } catch (err) {
          console.error("Error fetching balance:", err);
          balanceEl.textContent = "Could not fetch balance";
          balanceEl.style.display = "block";
        }

        connectBtn.style.display = "none";
        sendBtn.style.display = "inline-block";
      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = "github-bounty-status github-bounty-status-error";
        statusEl.style.display = "block";
        connectBtn.disabled = false;
        connectBtn.textContent = "Connect Wallet";
      }
    });

    // Send tokens
    sendBtn.addEventListener("click", async () => {
      const amount = parseFloat(amountInput.value);

      if (!amount || amount <= 0) {
        statusEl.textContent = "Please enter a valid amount";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        return;
      }

      if (!connectedAccount) {
        statusEl.textContent = "Please connect your wallet first";
        statusEl.className = "github-bounty-status github-bounty-status-error";
        return;
      }

      try {
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";
        statusEl.textContent = "Sending tokens...";
        statusEl.className = "github-bounty-status github-bounty-status-info";

        const result = await sendTokens(connectedAccount, amount);

        statusEl.innerHTML = `Success! Transaction: <a href="https://sepolia.etherscan.io/tx/${
          result.txHash
        }" target="_blank">${result.txHash.substring(0, 10)}...</a>`;
        statusEl.className =
          "github-bounty-status github-bounty-status-success";

        sendBtn.textContent = "Sent!";

        // Close modal after 3 seconds
        setTimeout(() => {
          closeModal();
        }, 3000);
      } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = "github-bounty-status github-bounty-status-error";
        sendBtn.disabled = false;
        sendBtn.textContent = "Send Tokens";
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

  // Wait for page to load and observe changes (GitHub uses dynamic content)
  function init() {
    console.log("GitHub Bounty: Initializing...");

    // Try immediately
    addSponsorButton();

    // Also observe DOM changes (GitHub loads content dynamically)
    const observer = new MutationObserver(function (mutations) {
      if (!document.getElementById("github-bounty-sponsor-btn")) {
        addSponsorButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Try multiple times with delays to catch late-loading content
    setTimeout(addSponsorButton, 500);
    setTimeout(addSponsorButton, 1000);
    setTimeout(addSponsorButton, 2000);
    setTimeout(addSponsorButton, 3000);
    setTimeout(addSponsorButton, 5000);
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
})();
