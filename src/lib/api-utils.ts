import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AuthenticatedContext {
  /** Authenticated user */
  user: { id: string; email?: string }
  /** Supabase client with user's session (for RLS) */
  supabase: SupabaseClient
  /** Supabase service-role client (bypasses RLS) */
  serviceClient: SupabaseClient
}

type AuthenticatedHandler = (
  request: Request,
  ctx: AuthenticatedContext
) => Promise<NextResponse>

/**
 * Wraps an API route handler with authentication checks.
 * Handles cookie management, user verification, and service client creation.
 *
 * Usage:
 * ```ts
 * export const POST = createAuthenticatedRoute(async (request, { user, serviceClient }) => {
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ userId: user.id })
 * })
 * ```
 */
export function createAuthenticatedRoute(handler: AuthenticatedHandler) {
  return async (request: Request): Promise<NextResponse> => {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Read-only in API routes
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert.' },
        { status: 401 }
      )
    }

    const serviceClient = createServiceClient()

    return handler(request, { user, supabase, serviceClient })
  }
}

/**
 * Parse and validate JSON body from a request.
 * Returns the parsed data or a NextResponse with a 400 error.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T | NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error?.issues[0]?.message ?? 'Ungültige Eingabe.' },
      { status: 400 }
    )
  }

  return parsed.data as T
}
