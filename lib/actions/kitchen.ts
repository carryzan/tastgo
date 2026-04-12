'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  LAST_KITCHEN_COOKIE,
  LAST_KITCHEN_COOKIE_OPTIONS,
} from '@/lib/constants'

export async function setLastKitchen(kitchenId: string) {
  const cookieStore = await cookies()

  cookieStore.set(LAST_KITCHEN_COOKIE, kitchenId, LAST_KITCHEN_COOKIE_OPTIONS)
}

export async function clearLastKitchen() {
  const cookieStore = await cookies()
  cookieStore.delete(LAST_KITCHEN_COOKIE)
}

export async function updateKitchenSettings(
  kitchenId: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('kitchen_settings')
    .update(updates)
    .eq('kitchen_id', kitchenId)

  if (!error) {
    revalidatePath(`/${kitchenId}`)
  }

  return error
}
