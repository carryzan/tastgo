import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  KITCHEN_ID_PATH_SEGMENT,
  LAST_KITCHEN_COOKIE,
  LAST_KITCHEN_COOKIE_OPTIONS,
} from '@/lib/constants'

function copyAuthCookies(
  from: NextResponse,
  to: NextResponse,
) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie.name, cookie.value)
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
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

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login')
  ) {
    // no user, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const pathname = request.nextUrl.pathname
  const shouldResolveKitchen =
    user &&
    (pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname === '/no-kitchen')

  // authenticated user on /, /login, or /no-kitchen → resolve kitchen and redirect when needed
  if (shouldResolveKitchen) {
    const url = request.nextUrl.clone()
    const isNoKitchenPage = pathname === '/no-kitchen'

    // 1. try the cookie first — fast path, no DB query (skip on /no-kitchen so a refresh
    //    re-queries after the user is invited; cookie may be absent or stale)
    let shouldClearLastKitchenCookie = false

    if (!isNoKitchenPage) {
      const lastKitchenId = request.cookies.get(LAST_KITCHEN_COOKIE)?.value

      if (lastKitchenId) {
        if (KITCHEN_ID_PATH_SEGMENT.test(lastKitchenId)) {
          const { data: lastKitchenMembership } = await supabase
            .from('kitchen_members')
            .select('kitchen_id')
            .eq('profile_id', user.sub)
            .eq('kitchen_id', lastKitchenId)
            .eq('is_active', true)
            .maybeSingle()

          if (lastKitchenMembership?.kitchen_id === lastKitchenId) {
            url.pathname = `/${lastKitchenId}/dashboard`
            const response = NextResponse.redirect(url)
            copyAuthCookies(supabaseResponse, response)
            return response
          }
        }

        shouldClearLastKitchenCookie = true
      }
    }

    // 2. resolve oldest kitchen using the middleware Supabase client
    const { data: kitchens } = await supabase
      .from('kitchen_members')
      .select('kitchen_id')
      .eq('profile_id', user.sub)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)

    const firstKitchenId = kitchens?.[0]?.kitchen_id

    if (!firstKitchenId) {
      if (isNoKitchenPage) {
        const response = NextResponse.next({ request })
        copyAuthCookies(supabaseResponse, response)
        response.cookies.delete({ name: LAST_KITCHEN_COOKIE, path: '/' })
        return response
      }

      url.pathname = '/no-kitchen'
      const response = NextResponse.redirect(url)
      copyAuthCookies(supabaseResponse, response)
      if (shouldClearLastKitchenCookie) {
        response.cookies.delete({ name: LAST_KITCHEN_COOKIE, path: '/' })
      }
      return response
    }

    // 3. set last kitchen cookie and redirect
    url.pathname = `/${firstKitchenId}/dashboard`
    const response = NextResponse.redirect(url)
    copyAuthCookies(supabaseResponse, response)
    response.cookies.set(
      LAST_KITCHEN_COOKIE,
      firstKitchenId,
      LAST_KITCHEN_COOKIE_OPTIONS,
    )

    return response
  }

  // /[kitchen-id] with no subpath → /[kitchen-id]/dashboard
  if (user) {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 1 && KITCHEN_ID_PATH_SEGMENT.test(segments[0])) {
      const kitchenId = segments[0]
      const url = request.nextUrl.clone()
      url.pathname = `/${kitchenId}/dashboard`
      const response = NextResponse.redirect(url)
      copyAuthCookies(supabaseResponse, response)
      response.cookies.set(
        LAST_KITCHEN_COOKIE,
        kitchenId,
        LAST_KITCHEN_COOKIE_OPTIONS,
      )
      return response
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!
  return supabaseResponse
}
