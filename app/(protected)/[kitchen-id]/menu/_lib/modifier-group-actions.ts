'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ModifierOptionType =
  | 'addition'
  | 'removal'
  | 'substitution'
  | 'neutral'

type ModifierComponentType = 'inventory_item' | 'production_recipe'
type ModifierComponentDirection = 'add' | 'remove'
type ModifierPricePortionBehavior = 'scale_with_portion' | 'fixed'

interface CreateModifierGroupComponentData {
  direction: ModifierComponentDirection
  component_type: ModifierComponentType
  inventory_item_id: string | null
  production_recipe_id: string | null
  quantity: number | null
  uom_id: string | null
  sort_order: number
}

interface CreateModifierGroupOptionData {
  name: string
  type: ModifierOptionType
  price_charge: number
  is_active: boolean
  is_default: boolean
  price_portion_behavior: ModifierPricePortionBehavior
  components: CreateModifierGroupComponentData[]
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
        price_charge: option.price_charge,
        is_active: option.is_active,
        is_default: option.is_default,
        price_portion_behavior: option.price_portion_behavior,
        components: option.components.map((component) => ({
          direction: component.direction,
          component_type: component.component_type,
          inventory_item_id: component.inventory_item_id,
          production_recipe_id: component.production_recipe_id,
          quantity: component.quantity,
          uom_id: component.uom_id,
          sort_order: component.sort_order,
        })),
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

export async function saveModifierGroupPortions(
  modifierGroupId: string,
  kitchenId: string,
  portions: {
    portion_id: string
    is_default: boolean
    sort_order: number
  }[]
) {
  const supabase = await createClient()
  const normalizedPortions = portions.map((portion, index) => ({
    ...portion,
    is_default:
      portion.is_default ||
      (!portions.some((candidate) => candidate.is_default) && index === 0),
  }))

  const { data: existing, error: fetchError } = await supabase
    .from('modifier_group_portions')
    .select('id, portion_id')
    .eq('modifier_group_id', modifierGroupId)
    .eq('kitchen_id', kitchenId)

  if (fetchError) return new Error(fetchError.message)

  if ((existing ?? []).length > 0) {
    const { error: clearDefaultError } = await supabase
      .from('modifier_group_portions')
      .update({ is_default: false })
      .eq('modifier_group_id', modifierGroupId)
      .eq('kitchen_id', kitchenId)
    if (clearDefaultError) return new Error(clearDefaultError.message)
  }

  const incomingIds = new Set(
    normalizedPortions.map((portion) => portion.portion_id)
  )
  const toRemove = (existing ?? [])
    .filter((row) => !incomingIds.has(String(row.portion_id)))
    .map((row) => String(row.id))

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('modifier_group_portions')
      .delete()
      .in('id', toRemove)
    if (deleteError) return new Error(deleteError.message)
  }

  for (const portion of normalizedPortions) {
    const existingRow = (existing ?? []).find(
      (row) => String(row.portion_id) === portion.portion_id
    )
    const payload = {
      kitchen_id: kitchenId,
      modifier_group_id: modifierGroupId,
      portion_id: portion.portion_id,
      is_default: portion.is_default,
      sort_order: portion.sort_order,
    }

    if (existingRow) {
      const { error } = await supabase
        .from('modifier_group_portions')
        .update(payload)
        .eq('id', existingRow.id)
        .eq('kitchen_id', kitchenId)
      if (error) return new Error(error.message)
    } else {
      const { error } = await supabase
        .from('modifier_group_portions')
        .insert(payload)
      if (error) return new Error(error.message)
    }
  }

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
