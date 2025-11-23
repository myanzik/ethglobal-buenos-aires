const githubBtn = document.getElementById("login-github");
const walletBtn = document.getElementById("login-wallet");
const statusEl = document.getElementById("status");

const githubLabel = githubBtn
  ? githubBtn.querySelector("span:last-child")
  : null;

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
  }
}

function updateGithubUI(user) {
  if (!githubBtn || !githubLabel) return;

  if (user) {
    githubBtn.classList.remove("is-dark");
    githubBtn.classList.add("is-success", "is-light", "is-rounded");
    githubBtn.disabled = true;

    githubLabel.textContent = "GitHub connected";

    if (statusEl) {
      statusEl.textContent = `Logged in as ${user.login}`;
    }
  } else {
const githubBtn = document.getElementById("login-github");
const statusEl = document.getElementById("status");

const githubLabel = githubBtn
  ? githubBtn.querySelector("span:last-child")
  : null;

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
  }
}

function updateGithubUI(user) {
  if (!githubBtn || !githubLabel) return;

  if (user) {
    githubBtn.classList.remove("is-dark");
    githubBtn.classList.add("is-success", "is-light", "is-rounded");
    githubBtn.disabled = true;

    githubLabel.textContent = "GitHub connected";

    if (statusEl) {
      statusEl.textContent = `Logged in as ${user.login}`;
    }
  } else {
    githubBtn.classList.remove("is-success", "is-light", "is-rounded");
    githubBtn.classList.add("is-dark");
    githubBtn.disabled = false;

    githubLabel.textContent = "Login with GitHub";
    if (statusEl) {
      statusEl.textContent = "Ready.";
    }
  }
}

function storageGet(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(obj) {
  return new Promise(resolve => {
    chrome.storage.local.set(obj, resolve);
  });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

async function handleGithubLogin() {
  if (!githubBtn) return;

  const data = await storageGet(["githubUser"]);
  if (data.githubUser) {
    updateGithubUI(data.githubUser);
    if (statusEl) {
      statusEl.textContent = `Already logged in as ${data.githubUser.login}`;
    }
    return;
  }

  try {
    setLoading(githubBtn, true, "Opening GitHub login...");

    const response = await sendRuntimeMessage({ type: "LOGIN_GITHUB" });
    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : "GitHub login failed");
    }

    const user = response.user;
    await storageSet({ githubUser: user });

    updateGithubUI(user);
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = `GitHub login error: ${err.message}`;
  } finally {
    setLoading(githubBtn, false);
  }
}

if (githubBtn) {
  githubBtn.addEventListener("click", () => {
    void handleGithubLogin();
  });
}

chrome.storage.local.get(["githubUser"], data => {
  if (data.githubUser) {
    updateGithubUI(data.githubUser);
  } else {
    updateGithubUI(null);
  }
});
    githubBtn.classList.remove("is-success", "is-light", "is-rounded");
    githubBtn.classList.add("is-dark");
    githubBtn.disabled = false;

    githubLabel.textContent = "Login with GitHub";
    if (statusEl) {
      statusEl.textContent = "Ready.";
    }
  }
}


function storageGet(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(obj) {
  return new Promise(resolve => {
    chrome.storage.local.set(obj, resolve);
  });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

async function handleGithubLogin() {
  if (!githubBtn) return;

  const data = await storageGet(["githubUser"]);
  if (data.githubUser) {
    updateGithubUI(data.githubUser);
    if (statusEl) {
      statusEl.textContent = `Already logged in as ${data.githubUser.login}`;
    }
    return;
  }

  try {
    setLoading(githubBtn, true, "Opening GitHub login...");

    const response = await sendRuntimeMessage({ type: "LOGIN_GITHUB" });
    if (!response || !response.ok) {
      throw new Error(response && response.error ? response.error : "GitHub login failed");
    }

    const user = response.user;
    await storageSet({ githubUser: user });

    updateGithubUI(user);
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = `GitHub login error: ${err.message}`;
  } finally {
    setLoading(githubBtn, false);
  }
}

if (githubBtn) {
  githubBtn.addEventListener("click", () => {
    void handleGithubLogin();
  });
}

if (walletBtn) {
  walletBtn.addEventListener("click", async () => {
    try {
      setLoading(walletBtn, true, "Connecting wallet (mock)...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (statusEl) statusEl.textContent = "Wallet connected (mock).";
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = "Error while connecting wallet.";
    } finally {
      setLoading(walletBtn, false);
    }
  });
}

chrome.storage.local.get(["githubUser"], data => {
  if (data.githubUser) {
    updateGithubUI(data.githubUser);
  } else {
    updateGithubUI(null);
  }
});
