import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/middleware'

/**
 * NSBS Portal — Server Proxy
 *
 * Runs before rendering on every matched route.
 * Refreshes the Supabase session cookie and protects /admin/dashboard.
 *
 * NOTE: In Next.js 16 the "middleware" file convention was renamed to "proxy".
 * The exported function must be named `proxy` (not `middleware`).
 * See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Only run on admin dashboard routes.
    // This deliberately excludes /admin (the login page itself) so the
    // login form is always accessible to unauthenticated visitors.
    '/admin/dashboard/:path*',
  ],
}
