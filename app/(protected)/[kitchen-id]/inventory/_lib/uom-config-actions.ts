'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateUOMConfigData {
  kitchen_id: string
  inventory_item_id: string
  purchase_uom_id: string | null
  storage_uom_id: string
  recipe_uom_id: string
  purchase_to_storage_factor: number | null
  storage_to_recipe_factor: number
}

interface UpdateUOMConfigData {
  purchase_uom_id?: string | null
  storage_uom_id?: string
  recipe_uom_id?: string
  purchase_to_storage_factor?: number | null
  storage_to_recipe_factor?: number
}

export async function createUOMConfig(data: CreateUOMConfigData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_item_uom_configurations')
    .insert(data)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function updateUOMConfig(
  id: string,
  updates: UpdateUOMConfigData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_item_uom_configurations')
    .update(updates)
    .eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
