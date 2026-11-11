import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Singleton browser Supabase client.
 *
 * A single GoTrueClient must exist per browser context. Calling
 * createBrowserClient() more than once triggers the
 * "Multiple GoTrueClient instances detected" warning and can cause session
 * state to desync between the auth and data layers.
 *
 * Rules:
 *  - Browser components (login, dashboard) import createClient() from here.
 *  - db.ts imports getSupabaseClient() for all database / storage calls.
 *  - server.ts (SSR) and middleware.ts create their own server-side clients
 *    per request — that is intentional and safe.
 */

let _browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }
  return _browserClient
}

/**
 * Alias used by db.ts so the data layer shares the same client instance as
 * the auth layer. Never call createBrowserClient() directly in db.ts.
 */
export { createClient as getSupabaseClient }
