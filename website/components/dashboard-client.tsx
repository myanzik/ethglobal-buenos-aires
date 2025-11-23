'use client';

import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  GitPullRequest,
  GithubIcon,
  Home,
  ListChecks,
  Settings,
  Trophy,
  Wallet,
  User,
  Loader2,
  RefreshCw,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { GitHubAuthButton } from "./github-auth-button";
import { useAuth } from "@/lib/auth-context";
import { useGitHubData } from "@/lib/hooks/use-github-data";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClaimRewardDialog } from "./claim-reward-dialog";
import { AddBountyDialog } from "./add-bounty-dialog";
import { DepositFundsDialog } from "./deposit-funds-dialog";
import { Issue } from "@/lib/github-api";

export function DashboardClient() {
  const { authState } = useAuth();
  const {
    repositories,
    selectedRepo,
    issues,
    pullRequests,
    bounties,
    isLoading,
    error,
    selectRepository,
    refreshData,
  } = useGitHubData();

  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<{
    id: string | number;
    title: string;
    amount: number;
    prNumber?: number;
    repository?: string;
  } | null>(null);
  
  const [bountyDialogOpen, setBountyDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);

  // Count open bounties
  const openBountiesCount = Object.values(bounties).filter(
    (bounty) => bounty.status === "open"
  ).length;

  // Calculate total funding
  const totalFunding = Object.values(bounties).reduce(
    (sum, bounty) => sum + bounty.amount,
    0
  );

  // Filter claimed bounties
  const claimedBounties = Object.values(bounties).filter(
    (bounty) => bounty.status === "claimed"
  );

  const handleRefresh = async () => {
    await refreshData();
  };

  const handleRepoChange = (repoFullName: string) => {
    const repo = repositories.find((r) => r.full_name === repoFullName);
    if (repo) {
      selectRepository(repo);
    }
  };

  // Handle opening the claim dialog
  const handleOpenClaimDialog = (reward: {
    id: string | number;
    title: string;
    amount: number;
    prNumber?: number;
    repository?: string;
  }) => {
    setSelectedReward(reward);
    setClaimDialogOpen(true);
  };

  // Handle opening the add bounty dialog
  const handleOpenBountyDialog = (issue: Issue) => {
    setSelectedIssue(issue);
    setBountyDialogOpen(true);
  };

  // Handler for the custom event to open deposit dialog
  useEffect(() => {
    const handleOpenDepositDialog = () => {
      setDepositDialogOpen(true);
    };

    // Add event listener to this component
    const element = document.querySelector('[data-deposit-dialog="true"]');
    if (element) {
      element.addEventListener('open-deposit-dialog', handleOpenDepositDialog);
    }

    return () => {
      // Clean up
      if (element) {
        element.removeEventListener('open-deposit-dialog', handleOpenDepositDialog);
      }
    };
  }, []);

  return (
    <div className="p-6 space-y-6" data-deposit-dialog="true">
      {/* Repository selector */}
      {authState.isAuthenticated && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GithubIcon size={20} />
                <span className="font-medium">Select Repository:</span>
              </div>
              <div className="flex gap-2 items-center">
                <Select
                  disabled={isLoading || repositories.length === 0}
                  value={selectedRepo?.full_name || ""}
                  onValueChange={handleRepoChange}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select a repository" />
                  </SelectTrigger>
                  <SelectContent>
                    {repositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.full_name}>
                        {repo.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dialog components */}
      {selectedReward && (
        <ClaimRewardDialog
          isOpen={claimDialogOpen}
          onClose={() => setClaimDialogOpen(false)}
          reward={selectedReward}
        />
      )}
      
      {selectedIssue && (
        <AddBountyDialog
          isOpen={bountyDialogOpen}
          onClose={() => setBountyDialogOpen(false)}
          issue={selectedIssue}
        />
      )}
      
      <DepositFundsDialog
        isOpen={depositDialogOpen}
        onClose={() => setDepositDialogOpen(false)}
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-row items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Funding</p>
              <h3 className="text-2xl font-bold">${totalFunding}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-row items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ListChecks className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Bounties</p>
              <h3 className="text-2xl font-bold">{openBountiesCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-row items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rewards Claimed</p>
              <h3 className="text-2xl font-bold">{claimedBounties.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-row items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <GitPullRequest className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pull Requests</p>
              <h3 className="text-2xl font-bold">{pullRequests.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues">Open Issues</TabsTrigger>
          <TabsTrigger value="pull-requests">Pull Requests</TabsTrigger>
          <TabsTrigger value="rewards">Available Rewards</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedRepo
                  ? `Open Issues for ${selectedRepo.full_name}`
                  : "Open Issues with Bounties"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : !authState.isAuthenticated ? (
                <div className="text-center py-8">
                  <GithubIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-4">
                    Sign in with GitHub to view issues
                  </p>
                  <GitHubAuthButton />
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedRepo
                    ? "No issues found in this repository"
                    : "Select a repository to view issues"}
                </div>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue) => {
                    const issueBounty = bounties[issue.id];
                    return (
                      <div
                        key={issue.id}
                        className="bg-card border rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <ListChecks className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold">{issue.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {issue.repository.full_name} #{issue.number}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {issueBounty ? (
                            <>
                              <div className="font-bold text-primary">
                                ${issueBounty.amount}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                bounty
                              </div>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleOpenBountyDialog(issue)}
                            >
                              Add Bounty
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pull-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedRepo
                  ? `Pull Requests for ${selectedRepo.full_name}`
                  : "Active Pull Requests"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : !authState.isAuthenticated ? (
                <div className="text-center py-8">
                  <GithubIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-4">
                    Sign in with GitHub to view pull requests
                  </p>
                  <GitHubAuthButton />
                </div>
              ) : pullRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedRepo
                    ? "No pull requests found in this repository"
                    : "Select a repository to view pull requests"}
                </div>
              ) : (
                <div className="space-y-4">
                  {pullRequests.map((pr) => (
                    <div
                      key={pr.id}
                      className="bg-card border rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <GitPullRequest className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{pr.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {pr.repository.full_name} #{pr.number}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            pr.state === "open"
                              ? "outline"
                              : pr.state === "closed"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {pr.state}
                        </Badge>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {!authState.isAuthenticated ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-4">
                    Sign in with GitHub to view available rewards
                  </p>
                  <GitHubAuthButton />
                </div>
              ) : (
                <div className="space-y-4">
                    <div className="bg-card border rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            Refactor authentication system
                          </div>
                          <div className="text-sm text-muted-foreground">
                            PR #38 - Merged
                          </div>
                        </div>
                      </div>
                      <div>
                        <Button 
                          size="sm"
                          onClick={() => handleOpenClaimDialog({
                            id: "auth-refactor",
                            title: "Refactor authentication system",
                            amount: 650,
                            prNumber: 38,
                            repository: selectedRepo?.full_name || "example/repo"
                          })}
                        >
                          Claim $650
                        </Button>
                      </div>
                    </div>

                    <div className="bg-card border rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">Fix responsive layout</div>
                          <div className="text-sm text-muted-foreground">
                            PR #41 - Merged
                          </div>
                        </div>
                      </div>
                      <div>
                        <Button 
                          size="sm"
                          onClick={() => handleOpenClaimDialog({
                            id: "responsive-fix",
                            title: "Fix responsive layout",
                            amount: 200,
                            prNumber: 41,
                            repository: selectedRepo?.full_name || "example/repo"
                          })}
                        >
                          Claim $200
                        </Button>
                      </div>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {!authState.isAuthenticated ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-4">
                    Sign in with GitHub to view payment history
                  </p>
                  <GitHubAuthButton />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-card border rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">Reward Payment</div>
                        <div className="text-sm text-muted-foreground">
                          Oct 15, 2025
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">+$450</div>
                      <div className="text-xs text-muted-foreground">
                        Completed
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">Reward Payment</div>
                        <div className="text-sm text-muted-foreground">
                          Sep 28, 2025
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">+$750</div>
                      <div className="text-xs text-muted-foreground">
                        Completed
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">Funding Deposit</div>
                        <div className="text-sm text-muted-foreground">
                          Sep 10, 2025
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">+$2,000</div>
                      <div className="text-xs text-muted-foreground">
                        Deposit
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
