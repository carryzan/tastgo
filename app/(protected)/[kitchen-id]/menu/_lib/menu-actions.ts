'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createMenu(data: {
  kitchen_id: string
  brand_id: string
  name: string
  sort_order?: number
}) {
  const supabase = await createClient()
  const { sort_order = 0, ...rest } = data
  const { error } = await supabase.from('menus').insert({
    ...rest,
    sort_order,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/menu`)
}

export async function updateMenu(
  id: string,
  kitchenId: string,
  updates: {
    name?: string
    brand_id?: string
    is_active?: boolean
    sort_order?: number
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('menus')
    .update(updates)
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function deleteMenu(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}
