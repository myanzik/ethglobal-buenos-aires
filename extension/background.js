const GITHUB_CLIENT_ID = "SomETHing";
const GITHUB_CLIENT_SECRET = "SomETHing";
const GITHUB_SCOPES = ["read:user", "repo"].join(" ");

function getRedirectUrl() {
  return chrome.identity.getRedirectURL("github");
}

async function startGitHubOAuth() {
  const redirectUri = getRedirectUrl();
  const state = crypto.randomUUID();

  console.log("[OAuth] redirectUri =", redirectUri);

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", GITHUB_SCOPES);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("allow_signup", "false");

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true
      },
      (redirectedTo) => {
        if (chrome.runtime.lastError) {
          return reject(
            new Error("[OAuth] launchWebAuthFlow error: " + chrome.runtime.lastError.message)
          );
        }
        if (!redirectedTo) {
          return reject(new Error("[OAuth] No redirect URL returned"));
        }
        resolve(redirectedTo);
      }
    );
  });

  console.log("[OAuth] responseUrl =", responseUrl);

  const url = new URL(responseUrl);
  const returnedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    throw new Error(`[OAuth] GitHub error: ${error} - ${errorDescription || ""}`);
  }

  if (!code) {
    throw new Error("[OAuth] No code returned from GitHub");
  }

  if (returnedState !== state) {
    throw new Error("[OAuth] State mismatch (possible CSRF)");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json", 
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    })
  });

  const tokenData = await tokenRes.json();
  console.log("[OAuth] tokenData =", tokenData);

  if (tokenData.error) {
    throw new Error(
      `[OAuth] Token error: ${tokenData.error} - ${tokenData.error_description || ""}`
    );
  }

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error("[OAuth] No access token returned");
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.github+json"
    }
  });

  if (!userRes.ok) {
    throw new Error("[OAuth] Failed to fetch GitHub user: " + userRes.status);
  }

  const user = await userRes.json();
  console.log("[OAuth] user =", user);

  await chrome.storage.local.set({
    githubUser: user,
    githubAccessToken: accessToken
  });

  return user;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOGIN_GITHUB") {
    startGitHubOAuth()
      .then(user => {
        sendResponse({ ok: true, user });
      })
      .catch(err => {
        console.error(err);
        sendResponse({ ok: false, error: err.message });
      });
    return true; 
  }
});
