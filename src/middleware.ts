import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host') || '';

  // Exclude static assets, API routes, next internals, etc.
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.') ||
    url.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Detect subdomain
  const isLocalhost = hostname.includes('localhost');
  const parts = hostname.split('.');

  let subdomain = '';
  if (isLocalhost) {
    // Example: ali.localhost:3000 -> parts = ["ali", "localhost:3000"]
    if (parts.length > 1 && !parts[parts.length - 2].includes('localhost')) {
      subdomain = parts[0];
    }
  } else {
    // Example: ali.sanad-law.vercel.app -> parts = ["ali", "sanad-law", "vercel", "app"]
    // Example: ali.sanad.app -> parts = ["ali", "sanad", "app"]
    if (parts.length > 3 || (parts.length === 3 && parts[1] === 'sanad' && parts[2] === 'app')) {
      subdomain = parts[0];
    }
  }

  // If there is a subdomain and it's not "www" or "admin"
  if (subdomain && subdomain.toLowerCase() !== 'www' && subdomain.toLowerCase() !== 'admin') {
    // Rewrite internally to /lawyers/[subdomain]/[path...]
    url.pathname = `/lawyers/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
