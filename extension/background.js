const GITHUB_CLIENT_ID = "somETHing"
const GITHUB_CLIENT_SECRET = "somETHing";
const GITHUB_SCOPES = ["read:user", "repo"].join(" ");

function getRedirectUrl() {
  return `https://${chrome.runtime.id}.chromiumapp.org/`;
}

async function startGitHubOAuth() {
  const redirectUri = getRedirectUrl();
  const state = crypto.randomUUID();

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", GITHUB_SCOPES);
  authUrl.searchParams.set("state", state);

  const redirectResponseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true
  });

  const url = new URL(redirectResponseUrl);
  const returnedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  if (!code || returnedState !== state) {
    throw new Error("Invalid OAuth response");
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
      redirect_uri: redirectUri,
      state
    })
  });

  if (!tokenRes.ok) {
    throw new Error("GitHub token endpoint error");
  }

  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    throw new Error("No access token returned");
  }

  const accessToken = tokenJson.access_token;

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.github+json"
    }
  });

  const user = await userRes.json();

  await chrome.storage.local.set({
    githubToken: accessToken,
    githubUser: user
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
