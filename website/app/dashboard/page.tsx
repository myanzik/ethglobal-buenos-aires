"use client";

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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardClient } from "@/components/dashboard-client";
import { GitHubAuthButton } from "@/components/github-auth-button";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function DashboardContent() {
  const { authState, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // First, check if there's a token in the URL
      const token = searchParams.get('token');
      
      if (token && !authState.isAuthenticated) {
        try {
          // Try to log in with the token
          await login(token);
          
          // Clean the URL by removing the token parameter
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url);
          
          setIsCheckingAuth(false);
        } catch (error) {
          console.error('Failed to authenticate with token:', error);
          setIsCheckingAuth(false);
          router.push("/login");
        }
      } else {
        // Wait a moment for the auth context to load from localStorage
        setTimeout(() => {
          setIsCheckingAuth(false);
          
          // If not authenticated after checking, redirect to login page
          if (!authState.isAuthenticated) {
            router.push("/login");
          }
        }, 500);
      }
    };

    checkAuth();
  }, [authState.isAuthenticated, router, searchParams, login]);

  // Show loading state while checking authentication
  if (isCheckingAuth || !authState.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">
            {isCheckingAuth ? "Loading..." : "Redirecting to login..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-secondary-foreground font-bold">G</span>
            </div>
            <span className="font-bold text-xl">GITHUNDER</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Home size={18} />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <GithubIcon size={18} />
            Issues & PRs
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <ListChecks size={18} />
            Bounties
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Trophy size={18} />
            Rewards
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Wallet size={18} />
            Payments
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings size={18} />
            Settings
          </Button>
        </nav>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
              {authState.user?.avatar_url ? (
                <img 
                  src={authState.user.avatar_url} 
                  alt={authState.user.login}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={20} className="text-secondary-foreground" />
              )}
            </div>
            <div>
              <div className="font-medium">{authState.user?.name || authState.user?.login || "GitHub User"}</div>
              <div className="text-xs text-muted-foreground">Signed in with GitHub</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Reward Dashboard</h1>
            <div className="flex gap-2">
              <GitHubAuthButton />
              <Button 
                className="gap-2"
                onClick={() => {
                  const dashboard = document.querySelector('[data-deposit-dialog="true"]');
                  if (dashboard) {
                    const depositEvent = new CustomEvent('open-deposit-dialog');
                    dashboard.dispatchEvent(depositEvent);
                  }
                }}
              >
                <DollarSign size={16} />
                Add Funds
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <DashboardClient />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}