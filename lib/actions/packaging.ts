'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type PackagingSourceScope = 'all' | 'online' | 'offline'

export interface PackagingItemInput {
  name: string
  inventory_item_id: string
  default_quantity: number
  auto_add: boolean
  source_type_scope: PackagingSourceScope
  sort_order: number
  is_active: boolean
}

function revalidateKitchen(kitchenId: string) {
  revalidatePath(`/${kitchenId}`)
  revalidatePath(`/${kitchenId}/point-of-sale`)
}

export async function createPackagingItem(
  kitchenId: string,
  input: PackagingItemInput
): Promise<string | Error> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('packaging_items')
    .insert({
      kitchen_id: kitchenId,
      name: input.name,
      inventory_item_id: input.inventory_item_id,
      default_quantity: input.default_quantity,
      auto_add: input.auto_add,
      source_type_scope: input.source_type_scope,
      sort_order: input.sort_order,
      is_active: input.is_active,
    })
    .select('id')
    .single()

  if (error) return new Error(error.message)
  revalidateKitchen(kitchenId)
  return String(data.id)
}

export async function updatePackagingItem(
  kitchenId: string,
  id: string,
  updates: Partial<PackagingItemInput>
): Promise<void | Error> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('packaging_items')
    .update(updates)
    .eq('kitchen_id', kitchenId)
    .eq('id', id)

  if (error) return new Error(error.message)
  revalidateKitchen(kitchenId)
}

export async function deletePackagingItem(
  kitchenId: string,
  id: string
): Promise<void | Error> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('packaging_items')
    .delete()
    .eq('kitchen_id', kitchenId)
    .eq('id', id)

  if (error) return new Error(error.message)
  revalidateKitchen(kitchenId)
}
