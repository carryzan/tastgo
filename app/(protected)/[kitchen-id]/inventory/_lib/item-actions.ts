'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateInventoryItemData {
  kitchen_id: string
  name: string
  category_id: string | null
  image_url: string | null
  storage_uom_id: string | null
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
  storage_uom_id?: string | null
  yield_percentage?: number
  par_level?: number | null
  min_level?: number | null
  max_level?: number | null
  cycle_count_frequency?: string | null
  location_label?: string | null
  is_active?: boolean
}

const KITCHEN_ASSETS_BUCKET = 'kitchen-assets'

function kitchenAssetPath(url: string | null) {
  if (!url) return null
  return url.split(`/${KITCHEN_ASSETS_BUCKET}/`)[1] ?? null
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

export async function deleteInventoryItem(kitchenId: string, itemId: string) {
  const supabase = await createClient()

  const { data: item, error: itemError } = await supabase
    .from('inventory_items')
    .select('image_url')
    .eq('kitchen_id', kitchenId)
    .eq('id', itemId)
    .single()

  if (itemError) return new Error(itemError.message)

  const path = kitchenAssetPath(item.image_url)
  if (path) {
    const { error: storageError } = await supabase.storage
      .from(KITCHEN_ASSETS_BUCKET)
      .remove([path])
    if (storageError) return new Error(storageError.message)
  }

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('kitchen_id', kitchenId)
    .eq('id', itemId)

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
