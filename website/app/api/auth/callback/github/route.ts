import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/github-auth';

export async function GET(request: NextRequest) {
  // Get the authorization code from the URL query parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  // Validate the state to prevent CSRF attacks
  // In a production app, you would compare this with a stored state
  
  if (!code) {
    return NextResponse.redirect(new URL('/api/auth/error?error=no_code', request.url));
  }

  try {
    // Exchange the code for an access token
    const accessToken = await exchangeCodeForToken(code);
    
    // Redirect to the dashboard with the token
    const redirectUrl = new URL('/dashboard', request.url);
    
    // In a real implementation, you might set an HTTP-only cookie instead of using URL parameters
    redirectUrl.searchParams.set('token', accessToken);
    redirectUrl.searchParams.set('auth_success', 'true');
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('GitHub authentication error:', error);
    return NextResponse.redirect(new URL('/api/auth/error?error=auth_failed', request.url));
  }
}
