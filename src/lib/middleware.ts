import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * NSBS Admin Session Refresher
 *
 * Must be called from proxy.ts on every request to /admin/dashboard.
 * Refreshes the Supabase session cookie and enforces authentication.
 * Unauthenticated visitors are redirected to /admin (the login page).
 *
 * IMPORTANT: Do not add any code between createServerClient and
 * supabase.auth.getClaims(). Even a single awaited call in between
 * can cause intermittent logout bugs due to cookie timing issues.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims() is the recommended method in @supabase/ssr@0.12.7 for
  // proxy/middleware usage.  It verifies the JWT locally using the JWKS cache
  // (no network round-trip) when the token is still valid, and falls back to
  // getSession() to refresh when the access token has expired.
  //
  // If getClaims() itself throws (e.g. Supabase project is temporarily
  // unreachable during a token refresh), we treat the session as unknown and
  // redirect to login.  This keeps the middleware from crashing and avoids
  // logging the admin in with an unverified session.
  let isAuthenticated = false
  try {
    const { data } = await supabase.auth.getClaims()
    isAuthenticated = !!data?.claims
  } catch {
    // Network error during session refresh — treat as unauthenticated.
    // The admin will be redirected to the login page where they can
    // sign in again once the Supabase project is reachable.
    isAuthenticated = false
  }

  // Protect /admin/dashboard and all sub-paths.
  // Redirect unauthenticated visitors to the login page.
  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: Return supabaseResponse as-is to preserve cookie state.
  // Never create a new NextResponse.next() here — it would lose the
  // refreshed session cookies set by setAll above.
  return supabaseResponse
}
