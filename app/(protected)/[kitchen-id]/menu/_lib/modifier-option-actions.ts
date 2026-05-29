'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ModifierOptionType =
  | 'addition'
  | 'removal'
  | 'substitution'
  | 'neutral'

export type ModifierComponentType = 'inventory_item' | 'production_recipe'
export type ModifierComponentDirection = 'add' | 'remove'
export type ModifierPricePortionBehavior = 'scale_with_portion' | 'fixed'

export interface ModifierComponentInput {
  id?: string
  direction: ModifierComponentDirection
  component_type: ModifierComponentType
  inventory_item_id: string | null
  production_recipe_id: string | null
  quantity: number | null
  uom_id: string | null
  sort_order: number
}

export interface ModifierOptionInput {
  id?: string
  name: string
  type: ModifierOptionType
  price_charge: number
  is_active: boolean
  is_default: boolean
  price_portion_behavior: ModifierPricePortionBehavior
  components: ModifierComponentInput[]
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
      price_charge: opt.price_charge,
      is_active: opt.is_active,
      is_default: opt.is_default,
      price_portion_behavior: opt.price_portion_behavior,
    }

    let optionId = opt.id
    if (opt.id) {
      const { error: upError } = await supabase
        .from('modifier_options')
        .update(payload)
        .eq('id', opt.id)
        .eq('kitchen_id', kitchenId)
      if (upError) return new Error(upError.message)
    } else {
      const { data: inserted, error: insError } = await supabase
        .from('modifier_options')
        .insert(payload)
        .select('id')
        .single()
      if (insError) return new Error(insError.message)
      optionId = inserted?.id ? String(inserted.id) : undefined
    }

    if (!optionId) return new Error('Failed to save modifier option.')

    const { error: deleteComponentsError } = await supabase
      .from('modifier_option_components')
      .delete()
      .eq('modifier_option_id', optionId)
      .eq('kitchen_id', kitchenId)
    if (deleteComponentsError) return new Error(deleteComponentsError.message)

    if (opt.components.length > 0) {
      const { error: componentsError } = await supabase
        .from('modifier_option_components')
        .insert(
          opt.components.map((component, index) => ({
            kitchen_id: kitchenId,
            modifier_option_id: optionId,
            direction: component.direction,
            component_type: component.component_type,
            inventory_item_id:
              component.component_type === 'inventory_item'
                ? component.inventory_item_id
                : null,
            production_recipe_id:
              component.component_type === 'production_recipe'
                ? component.production_recipe_id
                : null,
            quantity: component.direction === 'add' ? component.quantity : null,
            uom_id: component.direction === 'add' ? component.uom_id : null,
            sort_order: component.sort_order ?? index,
          }))
        )
      if (componentsError) return new Error(componentsError.message)
    }
  }

  revalidatePath(`/${kitchenId}/menu`)
}
