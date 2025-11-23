// GitHub OAuth Configuration
// These values should be stored in environment variables
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'your-github-client-id';
const GITHUB_REDIRECT_URI = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/github';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

// Types
export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  accessToken: string | null;
}

// Generate GitHub OAuth URL with scopes
export function getGitHubAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: 'user repo read:org',
    state: generateRandomState(),
  });

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

// Generate a random state for OAuth security
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Exchange the authorization code for an access token
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`);
  }
  
  return data.access_token;
}

// Get user information with the access token
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

// Get repositories for the authenticated user
export async function getUserRepositories(accessToken: string): Promise<any[]> {
  const response = await fetch(`${GITHUB_API_URL}/user/repos`, {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.statusText}`);
  }

  return response.json();
}

// Get issues for a repository
export async function getRepositoryIssues(accessToken: string, owner: string, repo: string): Promise<any[]> {
  const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/issues`, {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.statusText}`);
  }

  return response.json();
}

// Get pull requests for a repository
export async function getRepositoryPullRequests(accessToken: string, owner: string, repo: string): Promise<any[]> {
  const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/pulls`, {
    headers: {
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch pull requests: ${response.statusText}`);
  }

  return response.json();
}
