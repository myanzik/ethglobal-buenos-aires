'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../auth-context';
import { 
  fetchUserRepositories, 
  fetchRepositoryIssues, 
  fetchRepositoryPullRequests,
  getBountiesForIssues,
  Repository,
  Issue,
  PullRequest,
  Bounty
} from '../github-api';

interface UseGitHubDataReturn {
  repositories: Repository[];
  selectedRepo: Repository | null;
  issues: Issue[];
  pullRequests: PullRequest[];
  bounties: Record<number, Bounty>;
  isLoading: boolean;
  error: string | null;
  selectRepository: (repo: Repository | null) => void;
  refreshData: () => Promise<void>;
}

export function useGitHubData(): UseGitHubDataReturn {
  const { authState } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [bounties, setBounties] = useState<Record<number, Bounty>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch repositories when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.accessToken) {
      loadRepositories();
    } else {
      // Reset data when not authenticated
      setRepositories([]);
      setSelectedRepo(null);
      setIssues([]);
      setPullRequests([]);
      setBounties({});
    }
  }, [authState.isAuthenticated, authState.accessToken]);

  // Fetch issues and PRs when a repository is selected
  useEffect(() => {
    if (selectedRepo && authState.accessToken) {
      loadRepoData();
    }
  }, [selectedRepo, authState.accessToken]);

  // Load user repositories
  async function loadRepositories() {
    if (!authState.accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const repos = await fetchUserRepositories(authState.accessToken);
      setRepositories(repos);
    } catch (err) {
      setError('Failed to load repositories');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // Load repository issues and pull requests
  async function loadRepoData() {
    if (!selectedRepo || !authState.accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const [repoIssues, repoPRs] = await Promise.all([
        fetchRepositoryIssues(
          authState.accessToken,
          selectedRepo.owner.login,
          selectedRepo.name
        ),
        fetchRepositoryPullRequests(
          authState.accessToken,
          selectedRepo.owner.login,
          selectedRepo.name
        )
      ]);

      setIssues(repoIssues);
      setPullRequests(repoPRs);

      // Get bounties for issues
      const issueIds = repoIssues.map(issue => issue.id);
      const issueBounties = await getBountiesForIssues(issueIds);
      setBounties(issueBounties);
    } catch (err) {
      setError('Failed to load repository data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // Function to select a repository
  function selectRepository(repo: Repository | null) {
    setSelectedRepo(repo);
    // Clear existing data when switching repos
    setIssues([]);
    setPullRequests([]);
    setBounties({});
  }

  // Function to refresh all data
  async function refreshData() {
    await loadRepositories();
    if (selectedRepo) {
      await loadRepoData();
    }
  }

  return {
    repositories,
    selectedRepo,
    issues,
    pullRequests,
    bounties,
    isLoading,
    error,
    selectRepository,
    refreshData
  };
}
