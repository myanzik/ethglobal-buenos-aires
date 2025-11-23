"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; description: string }> = {
    no_code: {
      title: "Authentication Failed",
      description: "No authorization code was received from GitHub. Please try again.",
    },
    auth_failed: {
      title: "GitHub Authentication Error",
      description: "We couldn't authenticate with GitHub. Please check your credentials and try again.",
    },
    default: {
      title: "Something Went Wrong",
      description: "An unexpected error occurred during authentication. Please try again.",
    },
  };

  const errorInfo = errorMessages[error || "default"] || errorMessages.default;

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

      {/* Error Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">{errorInfo.title}</CardTitle>
            <CardDescription className="text-base">{errorInfo.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button asChild className="w-full" size="lg">
                <Link href="/login">Try Again</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/">Go Home</Link>
              </Button>
            </div>

            <div className="pt-4 text-center text-sm text-muted-foreground">
              <p>
                Need help?{" "}
                <a href="mailto:support@githunder.com" className="underline hover:text-foreground">
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}

