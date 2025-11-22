const githubBtn = document.getElementById("login-github");
const walletBtn = document.getElementById("login-wallet");
const statusEl = document.getElementById("status");

function setLoading(button, isLoading, message) {
  if (!button) return;

  if (isLoading) {
    button.classList.add("is-loading");
    button.disabled = true;
    if (statusEl && message) {
      statusEl.textContent = message;
    }
  } else {
    button.classList.remove("is-loading");
    button.disabled = false;
    if (statusEl) {
      statusEl.textContent = "Ready.";
    }
  }
}

githubBtn?.addEventListener("click", async () => {
  setLoading(githubBtn, true, "Connecting to GitHub...");

  try {
    // TODO: Implement GitHub connection
    await new Promise((resolve) => setTimeout(resolve, 1500)); 

    if (statusEl) {
      statusEl.textContent = "GitHub connected (mock).";
    }
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.textContent = "Error while connecting to GitHub.";
    }
  } finally {
    setLoading(githubBtn, false);
  }
});

walletBtn?.addEventListener("click", async () => {
  setLoading(walletBtn, true, "Connecting wallet...");

  try {
    // TODO: Implement wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (statusEl) {
      statusEl.textContent = "Wallet connected (mock).";
    }
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.textContent = "Error while connecting wallet.";
    }
  } finally {
    setLoading(walletBtn, false);
  }
});

