import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Cached per-request. Uses getClaims() instead of getUser() to avoid
 * a round-trip to the Auth server — claims.sub is the user ID.
 * React cache() deduplicates across parallel calls in Promise.all.
 */
const getUserId = cache(async (): Promise<string> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    throw new Error('Not authenticated')
  }

  return data.claims.sub as string
})

export async function getMembership(kitchenId: string) {
  const supabase = await createClient()
  const userId = await getUserId()

  return supabase
    .from('kitchen_members')
    .select('id, is_active, role_id, roles(name), profiles(*)')
    .eq('kitchen_id', kitchenId)
    .eq('profile_id', userId)
    .single()
}

export async function getMemberPermissions(kitchenId: string) {
  const supabase = await createClient()

  return supabase.rpc('get_member_permissions', {
    p_kitchen_id: kitchenId,
  })
}

export async function getMemberKitchens() {
  const supabase = await createClient()
  const userId = await getUserId()

  return supabase
    .from('kitchen_members')
    .select('kitchens(id, name)')
    .eq('profile_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
}
