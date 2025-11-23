# Githunder Dashboard

The Reward Dashboard is a central component of the Githunder platform that connects GitHub users with open source bounties. This document outlines the dashboard architecture, features, and implementation details.

## Features

1. **GitHub Authentication**
   - Sign in with GitHub using OAuth
   - Access to user repositories, issues, and PRs

2. **Repository Browsing**
   - View and select repositories
   - Filter and search issues and PRs

3. **Issue & PR Management**
   - View open issues and PRs
   - Add bounties to issues
   - Track PR status

4. **Reward System**
   - Claim rewards for completed PRs
   - View available rewards
   - Manage reward distribution

5. **Payment System**
   - Add funds to your account
   - Track payment history
   - Manage payment methods

## Architecture

The dashboard follows a client-server architecture:

- **Frontend**: Next.js with React and TypeScript
- **UI Components**: Shadcn UI (based on Radix UI)
- **State Management**: React Context API and custom hooks
- **API Integration**: GitHub API and custom backend endpoints

## Implementation Details

### Core Components

- `dashboard/page.tsx` - Main dashboard server component
- `dashboard/layout.tsx` - Layout wrapper for dashboard pages
- `dashboard-client.tsx` - Client component with interactive elements
- `github-auth-button.tsx` - GitHub authentication button
- `claim-reward-dialog.tsx` - Dialog for claiming rewards
- `add-bounty-dialog.tsx` - Dialog for adding bounties to issues
- `deposit-funds-dialog.tsx` - Dialog for adding funds

### Libraries and Utilities

- `lib/github-auth.ts` - GitHub OAuth authentication utilities
- `lib/github-api.ts` - GitHub API integration
- `lib/auth-context.tsx` - Authentication context provider
- `lib/hooks/use-github-data.ts` - Custom hook for GitHub data
- `lib/payment.ts` - Payment utilities and mock data

## Workflow

1. **Authentication Flow**
   - User clicks "Sign in with GitHub"
   - Redirected to GitHub for authorization
   - Returns with access token
   - Dashboard loads user data

2. **Repository Selection**
   - User selects a repository from dropdown
   - Dashboard loads issues and PRs for the repository
   - Bounty information is retrieved for issues

3. **Bounty Management**
   - User can add bounties to open issues
   - User can view existing bounties
   - User can claim rewards for completed PRs

4. **Fund Management**
   - User can add funds to their account
   - User can track payment history
   - User can manage payment methods

## Future Enhancements

1. Real-time notifications for PR status changes
2. Advanced filtering and sorting options
3. Metrics and analytics dashboard
4. Team management and organization support
5. Integration with additional version control platforms
