'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ModifierOptionType =
  | 'addition'
  | 'removal'
  | 'substitution'
  | 'neutral'

export interface ModifierOptionInput {
  id?: string
  name: string
  type: ModifierOptionType
  inventory_item_id: string | null
  removed_inventory_item_id: string | null
  quantity: number | null
  price_charge: number
  is_active: boolean
}

export async function saveModifierGroupOptions(
  modifierGroupId: string,
  kitchenId: string,
  options: ModifierOptionInput[]
) {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('modifier_options')
    .select('id')
    .eq('modifier_group_id', modifierGroupId)
    .eq('kitchen_id', kitchenId)

  if (fetchError) return new Error(fetchError.message)

  const incomingIds = new Set(
    options.map((o) => o.id).filter((id): id is string => Boolean(id))
  )
  const toRemove = (existing ?? [])
    .map((r) => r.id as string)
    .filter((id) => !incomingIds.has(id))

  if (toRemove.length > 0) {
    const { error: delError } = await supabase
      .from('modifier_options')
      .delete()
      .in('id', toRemove)
    if (delError) return new Error(delError.message)
  }

  for (const opt of options) {
    const payload = {
      modifier_group_id: modifierGroupId,
      kitchen_id: kitchenId,
      name: opt.name,
      type: opt.type,
      inventory_item_id: opt.inventory_item_id,
      removed_inventory_item_id: opt.removed_inventory_item_id,
      quantity: opt.quantity,
      price_charge: opt.price_charge,
      is_active: opt.is_active,
    }

    if (opt.id) {
      const { error: upError } = await supabase
        .from('modifier_options')
        .update(payload)
        .eq('id', opt.id)
        .eq('kitchen_id', kitchenId)
      if (upError) return new Error(upError.message)
    } else {
      const { error: insError } = await supabase
        .from('modifier_options')
        .insert(payload)
      if (insError) return new Error(insError.message)
    }
  }

  revalidatePath(`/${kitchenId}/menu`)
}
