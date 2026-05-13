'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ModifierOptionType =
  | 'addition'
  | 'removal'
  | 'substitution'
  | 'neutral'

interface CreateModifierGroupOptionData {
  name: string
  type: ModifierOptionType
  inventory_item_id: string | null
  removed_inventory_item_id: string | null
  quantity: number | null
  uom_id: string | null
  price_charge: number
  is_active: boolean
}

export async function createModifierGroup(data: {
  kitchen_id: string
  brand_id: string
  name: string
  min_selections?: number
  max_selections: number | null
  options: CreateModifierGroupOptionData[]
}) {
  const supabase = await createClient()
  const { data: groupId, error } = await supabase.rpc(
    'create_modifier_group_with_options',
    {
      p_kitchen_id: data.kitchen_id,
      p_brand_id: data.brand_id,
      p_name: data.name,
      p_min_selections: data.min_selections ?? 0,
      p_max_selections: data.max_selections,
      p_options: data.options.map((option) => ({
        name: option.name,
        type: option.type,
        inventory_item_id: option.inventory_item_id,
        removed_inventory_item_id: option.removed_inventory_item_id,
        quantity: option.quantity,
        uom_id: option.uom_id,
        price_charge: option.price_charge,
        is_active: option.is_active,
      })),
    }
  )

  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/menu`)
  return groupId as string
}

export async function updateModifierGroup(
  id: string,
  kitchenId: string,
  updates: {
    name?: string
    brand_id?: string
    min_selections?: number
    max_selections?: number | null
    is_active?: boolean
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('modifier_groups')
    .update(updates)
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function deleteModifierGroup(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('modifier_groups')
    .delete()
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}
