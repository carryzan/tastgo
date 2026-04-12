'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createInventoryCategory(data: {
  kitchen_id: string
  name: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('inventory_categories').insert(data)
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/inventory`)
}

export async function updateInventoryCategory(
  id: string,
  kitchenId: string,
  updates: { name?: string; is_active?: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_categories')
    .update(updates)
    .eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/inventory`)
}

export async function deleteInventoryCategory(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_categories')
    .delete()
    .eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/inventory`)
}
