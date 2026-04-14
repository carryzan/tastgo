'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateInventoryItemData {
  kitchen_id: string
  name: string
  category_id: string | null
  image_url: string | null
  yield_percentage: number
  par_level: number | null
  min_level: number | null
  max_level: number | null
  cycle_count_frequency: string | null
  location_label: string | null
}

interface UpdateInventoryItemData {
  name?: string
  category_id?: string | null
  image_url?: string | null
  yield_percentage?: number
  par_level?: number | null
  min_level?: number | null
  max_level?: number | null
  cycle_count_frequency?: string | null
  location_label?: string | null
  is_active?: boolean
}

export async function createInventoryItem(data: CreateInventoryItemData) {
  const supabase = await createClient()
  const { data: item, error } = await supabase
    .from('inventory_items')
    .insert(data)
    .select('id')
    .single()
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
  return item.id as string
}

export async function updateInventoryItem(
  id: string,
  updates: UpdateInventoryItemData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
