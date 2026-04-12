/** Default page size for `useServerTable` and matching prefetch query keys / ranges. */
export const DEFAULT_SERVER_TABLE_PAGE_SIZE = 20

/** Matches Supabase-style UUID kitchen ids in the first path segment only. */
export const KITCHEN_ID_PATH_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Cookie name for “remember last opened kitchen” (middleware + server actions). */
export const LAST_KITCHEN_COOKIE = 'last_kitchen_id'

/** Options aligned across middleware redirects and setLastKitchen(). */
export const LAST_KITCHEN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year — cleared explicitly on auth transitions
}
