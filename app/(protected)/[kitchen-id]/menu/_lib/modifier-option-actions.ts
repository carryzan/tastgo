'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ModifierOptionType =
  | 'addition'
  | 'removal'
  | 'substitution'
  | 'neutral'

export type ModifierComponentType = 'inventory_item' | 'production_recipe'
export type ModifierPricePortionBehavior = 'scale_with_portion' | 'fixed'

export interface ModifierOptionInput {
  id?: string
  name: string
  type: ModifierOptionType
  component_type: ModifierComponentType | null
  inventory_item_id: string | null
  production_recipe_id: string | null
  removed_component_type: ModifierComponentType | null
  removed_inventory_item_id: string | null
  removed_production_recipe_id: string | null
  quantity: number | null
  uom_id: string | null
  price_charge: number
  is_active: boolean
  is_default: boolean
  price_portion_behavior: ModifierPricePortionBehavior
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

  if ((existing ?? []).length > 0) {
    const { error: clearDefaultError } = await supabase
      .from('modifier_options')
      .update({ is_default: false })
      .eq('modifier_group_id', modifierGroupId)
      .eq('kitchen_id', kitchenId)
    if (clearDefaultError) return new Error(clearDefaultError.message)
  }

  if (toRemove.length > 0) {
    const { error: deactivateError } = await supabase
      .from('modifier_options')
      .update({ is_active: false, is_default: false })
      .in('id', toRemove)
      .eq('kitchen_id', kitchenId)
    if (deactivateError) return new Error(deactivateError.message)
  }

  for (const opt of options) {
    const payload = {
      modifier_group_id: modifierGroupId,
      kitchen_id: kitchenId,
      name: opt.name,
      type: opt.type,
      component_type: opt.component_type,
      inventory_item_id: opt.inventory_item_id,
      production_recipe_id: opt.production_recipe_id,
      removed_component_type: opt.removed_component_type,
      removed_inventory_item_id: opt.removed_inventory_item_id,
      removed_production_recipe_id: opt.removed_production_recipe_id,
      quantity: opt.quantity,
      uom_id: opt.uom_id,
      price_charge: opt.price_charge,
      is_active: opt.is_active,
      is_default: opt.is_default,
      price_portion_behavior: opt.price_portion_behavior,
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
