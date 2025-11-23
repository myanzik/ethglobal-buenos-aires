"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GithubIcon } from "lucide-react";
import { getGitHubAuthUrl } from "@/lib/github-auth";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { authState } = useAuth();
  const router = useRouter();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (authState.isAuthenticated) {
      router.push("/dashboard");
    }
  }, [authState.isAuthenticated, router]);

  const handleGitHubLogin = () => {
    window.location.href = getGitHubAuthUrl();
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-secondary-foreground font-bold text-xl">G</span>
            </div>
            <span className="text-2xl font-bold text-primary">GITHUNDER</span>
          </Link>
        </div>
      </nav>

      {/* Login Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-secondary-foreground font-bold text-4xl">G</span>
            </div>
            <CardTitle className="text-3xl font-bold">Welcome to Githunder</CardTitle>
            <CardDescription className="text-base">
              Connect your GitHub account to start managing bounties and earning rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGitHubLogin}
              className="w-full h-12 text-base gap-3"
              size="lg"
            >
              <GithubIcon className="w-5 h-5" />
              Continue with GitHub
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Why GitHub?
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>Access your repositories and issues directly</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>Automatic bounty tracking on pull requests</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <p>Seamless integration with your workflow</p>
              </div>
            </div>

            <div className="pt-4 text-center text-xs text-muted-foreground">
              By continuing, you agree to Githunder's{" "}
              <a href="#" className="underline hover:text-foreground">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="underline hover:text-foreground">Privacy Policy</a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Githunder. Fight bugs, win tokens.</p>
        </div>
      </footer>
    </div>
  );
}

