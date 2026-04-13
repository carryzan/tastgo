'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface RecipeComponentInput {
  component_type: 'inventory_item' | 'production_recipe'
  inventory_item_id?: string
  production_recipe_id?: string
  recipe_quantity: number
  uom_id: string
}

interface CreateMenuItemData {
  kitchen_id: string
  brand_id: string
  menu_id: string
  name: string
  price: number
  image_url?: string | null
}

interface UpdateMenuItemData {
  name?: string
  brand_id?: string
  menu_id?: string
  price?: number
  image_url?: string | null
  is_active?: boolean
}

export async function createMenuItem(data: CreateMenuItemData) {
  const supabase = await createClient()
  const { error } = await supabase.from('menu_items').insert(data)
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/menu`)
}

export async function updateMenuItem(
  id: string,
  kitchenId: string,
  updates: UpdateMenuItemData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('menu_items')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function deleteMenuItem(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function attachModifierGroup(
  menuItemId: string,
  modifierGroupId: string,
  kitchenId: string
) {
  const supabase = await createClient()
  const { error } = await supabase.from('menu_item_modifier_groups').insert({
    kitchen_id: kitchenId,
    menu_item_id: menuItemId,
    modifier_group_id: modifierGroupId,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function detachModifierGroup(
  menuItemId: string,
  modifierGroupId: string,
  kitchenId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('menu_item_modifier_groups')
    .delete()
    .eq('menu_item_id', menuItemId)
    .eq('modifier_group_id', modifierGroupId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/menu`)
}

export async function replaceMenuItemModifierGroups(
  menuItemId: string,
  kitchenId: string,
  rows: { modifier_group_id: string; sort_order: number }[]
) {
  const supabase = await createClient()
  const { error: delError } = await supabase
    .from('menu_item_modifier_groups')
    .delete()
    .eq('menu_item_id', menuItemId)
    .eq('kitchen_id', kitchenId)
  if (delError) return new Error(delError.message)

  if (rows.length > 0) {
    const { error: insError } = await supabase
      .from('menu_item_modifier_groups')
      .insert(
        rows.map((r) => ({
          kitchen_id: kitchenId,
          menu_item_id: menuItemId,
          modifier_group_id: r.modifier_group_id,
          sort_order: r.sort_order,
        }))
      )
    if (insError) return new Error(insError.message)
  }

  revalidatePath(`/${kitchenId}/menu`)
}

export async function createMenuItemRecipeVersion(data: {
  kitchen_id: string
  menu_item_id: string
  created_by: string
  components: RecipeComponentInput[]
}) {
  const supabase = await createClient()
  const { kitchen_id, menu_item_id, created_by, components } = data

  // Fetch yield_percentage for all inventory items used
  const inventoryItemIds = components
    .filter((c) => c.component_type === 'inventory_item' && c.inventory_item_id)
    .map((c) => c.inventory_item_id!)

  const yieldMap = new Map<string, number>()
  if (inventoryItemIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, yield_percentage')
      .in('id', inventoryItemIds)
    if (itemsError) return new Error(itemsError.message)
    for (const item of items ?? []) {
      yieldMap.set(item.id, item.yield_percentage as number)
    }
  }

  // Get next version number
  const { data: maxData, error: maxError } = await supabase
    .from('menu_item_recipe_versions')
    .select('version_number')
    .eq('menu_item_id', menu_item_id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxError) return new Error(maxError.message)

  const nextVersion = (maxData?.version_number ?? 0) + 1

  const { data: version, error: versionError } = await supabase
    .from('menu_item_recipe_versions')
    .insert({ kitchen_id, menu_item_id, version_number: nextVersion, created_by })
    .select('id')
    .single()

  if (versionError) return new Error(versionError.message)

  if (components.length > 0) {
    const { error: componentsError } = await supabase
      .from('menu_item_recipe_components')
      .insert(
        components.map((c) => {
          const qty = c.recipe_quantity
          let yieldAdjusted = qty
          if (c.component_type === 'inventory_item' && c.inventory_item_id) {
            const yieldPct = yieldMap.get(c.inventory_item_id) ?? 100
            yieldAdjusted = yieldPct > 0 ? qty / (yieldPct / 100) : qty
          }
          return {
            kitchen_id,
            recipe_version_id: version.id,
            component_type: c.component_type,
            inventory_item_id: c.inventory_item_id ?? null,
            production_recipe_id: c.production_recipe_id ?? null,
            recipe_quantity: qty,
            yield_adjusted_quantity: Number(yieldAdjusted.toFixed(4)),
            uom_id: c.uom_id,
          }
        })
      )
    if (componentsError) return new Error(componentsError.message)
  }

  const { error: updateError } = await supabase
    .from('menu_items')
    .update({ current_recipe_version_id: version.id })
    .eq('id', menu_item_id)

  if (updateError) return new Error(updateError.message)

  revalidatePath(`/${kitchen_id}/menu`)
}
