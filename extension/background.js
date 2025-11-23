const GITHUB_CLIENT_ID = "Ov23liCjRBayFxDoDmeN";
const GITHUB_CLIENT_SECRET = "c5d9a7489171bdf70f34f649e78e7d3f97f51f1f";
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
    githubToken: accessToken
  });

  return user;
}

async function fetchIssueContributors(owner, repo, issueNumber, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  const contributors = new Map();
  const addUser = (user) => {
    if (!user || !user.login) return;
    const count = contributors.get(user.login) ?? 0;
    contributors.set(user.login, count + 1);
  };

  // Pimary issue
  const issueResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    { headers },
  );
  if (!issueResp.ok) {
    throw new Error(`GitHub issue error: ${issueResp.status}`);
  }
  const issue = await issueResp.json();
  addUser(issue.user);

  // Issue comment
  const commentsResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    { headers },
  );
  if (!commentsResp.ok) {
    throw new Error(`GitHub comments error: ${commentsResp.status}`);
  }
  const comments = await commentsResp.json();
  comments.forEach((c) => addUser(c.user));

  // So add author, if a PR
  if (issue.pull_request) {
    const prResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${issueNumber}`,
      { headers },
    );
    if (prResp.ok) {
      const pr = await prResp.json();
      addUser(pr.user);
    }
  }

  return Array.from(contributors.entries()).map(([login, participationCount]) => ({
    login,
    participationCount,
  }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // GitHub login popup
  if (message.type === "LOGIN_GITHUB") {
    startGitHubOAuth()
      .then((user) => {
        sendResponse({ ok: true, user });
      })
      .catch((err) => {
        console.error(err);
        sendResponse({ ok: false, error: err.message });
      });
    return true; 
  }

  // Request from the content script for a given issue
  if (message.type === "OPEN_SPONSOR_FLOW") {
    (async () => {
      try {
        // key name: githubToken
        const { githubToken } = await chrome.storage.local.get(["githubToken"]);
        if (!githubToken) {
          throw new Error("No GitHub token found. Please login with GitHub first.");
        }

        const { owner, repo, issueNumber } = message.issue;
        const contributors = await fetchIssueContributors(
          owner,
          repo,
          issueNumber,
          githubToken,
        );

        sendResponse({ ok: true, contributors });
      } catch (e) {
        console.error(e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true; 
  }

  // Fetch PR data (author and contributors)
  if (message.type === "FETCH_PR_DATA") {
    (async () => {
      try {
        const { githubToken } = await chrome.storage.local.get(["githubToken"]);
        if (!githubToken) {
          sendResponse({ ok: false, error: "No GitHub token found" });
          return;
        }

        const { owner, repo, prNumber } = message;
        const headers = {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        };

        // Fetch PR data
        const prResp = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
          { headers }
        );

        if (!prResp.ok) {
          throw new Error(`GitHub PR error: ${prResp.status}`);
        }

        const pr = await prResp.json();
        
        // Extract author
        const author = pr.user?.login || null;

        // Fetch commits to get contributors
        const commitsResp = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`,
          { headers }
        );

        const contributors = new Set();
        if (commitsResp.ok) {
          const commits = await commitsResp.json();
          commits.forEach((commit) => {
            if (commit.author?.login) {
              contributors.add(commit.author.login);
            }
            if (commit.committer?.login) {
              contributors.add(commit.committer.login);
            }
          });
        }

        // Fetch reviews to get reviewers
        const reviewsResp = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
          { headers }
        );

        if (reviewsResp.ok) {
          const reviews = await reviewsResp.json();
          reviews.forEach((review) => {
            if (review.user?.login) {
              contributors.add(review.user.login);
            }
          });
        }

        // Remove author from contributors list
        contributors.delete(author);

        sendResponse({
          ok: true,
          prData: {
            author,
            contributors: Array.from(contributors),
          },
        });
      } catch (e) {
        console.error(e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});
