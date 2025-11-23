// Types
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  body: string | null;
  comments: number;
  repository: {
    name: string;
    full_name: string;
  };
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  body: string | null;
  comments: number;
  repository: {
    name: string;
    full_name: string;
  };
}

export interface Bounty {
  issueId: number;
  amount: number;
  status: 'open' | 'claimed' | 'closed';
  assignees: string[];
}

// GitHub API URLs
const GITHUB_API_URL = 'https://api.github.com';

// Fetch user repositories
export async function fetchUserRepositories(accessToken: string): Promise<Repository[]> {
  try {
    const response = await fetch(`${GITHUB_API_URL}/user/repos?sort=updated&per_page=100`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return [];
  }
}

// Fetch repository issues
export async function fetchRepositoryIssues(
  accessToken: string, 
  owner: string, 
  repo: string
): Promise<Issue[]> {
  try {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/issues?state=all&per_page=100`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.statusText}`);
    }

    const issues = await response.json();
    
    // Filter out pull requests (GitHub API returns PRs as issues)
    const filteredIssues = issues.filter((issue: any) => !issue.pull_request);
    
    // Add repository information to each issue
    return filteredIssues.map((issue: any) => ({
      ...issue,
      repository: {
        name: repo,
        full_name: `${owner}/${repo}`,
      },
    }));
  } catch (error) {
    console.error(`Error fetching issues for ${owner}/${repo}:`, error);
    return [];
  }
}

// Fetch repository pull requests
export async function fetchRepositoryPullRequests(
  accessToken: string, 
  owner: string, 
  repo: string
): Promise<PullRequest[]> {
  try {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/pulls?state=all&per_page=100`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pull requests: ${response.statusText}`);
    }

    const prs = await response.json();
    
    // Add repository information to each PR
    return prs.map((pr: any) => ({
      ...pr,
      repository: {
        name: repo,
        full_name: `${owner}/${repo}`,
      },
    }));
  } catch (error) {
    console.error(`Error fetching pull requests for ${owner}/${repo}:`, error);
    return [];
  }
}

// Search issues across all repositories the user has access to
export async function searchIssues(
  accessToken: string, 
  query: string
): Promise<Issue[]> {
  try {
    const q = `${query} type:issue`;
    const response = await fetch(`${GITHUB_API_URL}/search/issues?q=${encodeURIComponent(q)}&per_page=100`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search issues: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter out pull requests and format response
    return data.items
      .filter((item: any) => !item.pull_request)
      .map((issue: any) => {
        // Extract repository info from issue URL
        // Format: https://api.github.com/repos/{owner}/{repo}/issues/{number}
        const urlParts = issue.url.split('/');
        const repoOwner = urlParts[4];
        const repoName = urlParts[5];
        
        return {
          ...issue,
          repository: {
            name: repoName,
            full_name: `${repoOwner}/${repoName}`,
          },
        };
      });
  } catch (error) {
    console.error('Error searching issues:', error);
    return [];
  }
}

// Mock function to get bounties for issues - in real app this would be from a blockchain or API
export async function getBountiesForIssues(issueIds: number[]): Promise<Record<number, Bounty>> {
  // This is a mock implementation - in a real app, this would fetch from your backend/blockchain
  const mockBounties: Record<number, Bounty> = {};
  
  // Generate mock bounty data for the provided issue IDs
  issueIds.forEach(id => {
    const amount = Math.floor(Math.random() * 1000) + 100; // Random amount between 100 and 1100
    
    mockBounties[id] = {
      issueId: id,
      amount,
      status: Math.random() > 0.3 ? 'open' : 'claimed',
      assignees: [],
    };
  });
  
  return mockBounties;
}
