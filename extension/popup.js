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

githubBtn?.addEventListener("click", () => {
  setLoading(githubBtn, true, "Connecting to GitHub…");

  chrome.runtime.sendMessage({ type: "LOGIN_GITHUB" }, response => {
    setLoading(githubBtn, false);

    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      if (statusEl) statusEl.textContent = "GitHub login failed (no background).";
      return;
    }

    if (!response || !response.ok) {
      if (statusEl) statusEl.textContent = "GitHub login failed.";
      console.error(response?.error);
      return;
    }

    const user = response.user;
    if (statusEl) {
      statusEl.textContent = `Logged in as ${user.login}`;
    }
  });
});

walletBtn?.addEventListener("click", async () => {
  setLoading(walletBtn, true, "Connecting wallet...");

  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (statusEl) statusEl.textContent = "Wallet connected (mock).";
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = "Error while connecting wallet.";
  } finally {
    setLoading(walletBtn, false);
  }
});

chrome.storage.local.get(["githubUser"], data => {
  if (data.githubUser && statusEl) {
    statusEl.textContent = `Logged in as ${data.githubUser.login}`;
  }
});
