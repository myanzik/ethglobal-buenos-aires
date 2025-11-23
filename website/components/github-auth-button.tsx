'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { GithubIcon, LogOut } from 'lucide-react';
import { getGitHubAuthUrl } from '@/lib/github-auth';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams } from 'next/navigation';

export function GitHubAuthButton() {
  const { authState, login, logout } = useAuth();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Handle token from URL parameter (after redirect)
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token && !authState.isAuthenticated) {
      setIsLoading(true);
      
      login(token)
        .catch(error => {
          console.error('Failed to complete authentication:', error);
        })
        .finally(() => {
          setIsLoading(false);
          
          // Clean URL by removing the token parameter
          const url = new URL(window.location.href);
          url.searchParams.delete('token');
          window.history.replaceState({}, '', url);
        });
    }
  }, [searchParams, authState.isAuthenticated, login]);

  const handleLogin = () => {
    // Redirect to GitHub authorization page
    window.location.href = getGitHubAuthUrl();
  };

  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <GithubIcon className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  if (authState.isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {authState.user?.avatar_url && (
            <img 
              src={authState.user.avatar_url} 
              alt={`${authState.user.login}'s avatar`} 
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm font-medium hidden md:inline">
            {authState.user?.name || authState.user?.login}
          </span>
        </div>
        <Button variant="outline" size="icon" onClick={handleLogout} title="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={handleLogin}>
      <GithubIcon className="mr-2 h-4 w-4" />
      Sign in with GitHub
    </Button>
  );
}
