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
  components: RecipeComponentInput[]
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
  const { data: menuItemId, error } = await supabase.rpc(
    'create_menu_item_with_initial_version',
    {
      p_kitchen_id: data.kitchen_id,
      p_brand_id: data.brand_id,
      p_menu_id: data.menu_id,
      p_name: data.name,
      p_price: data.price,
      p_image_url: data.image_url ?? null,
      p_components: data.components.map((component) => ({
        component_type: component.component_type,
        inventory_item_id:
          component.component_type === 'inventory_item'
            ? (component.inventory_item_id ?? null)
            : null,
        production_recipe_id:
          component.component_type === 'production_recipe'
            ? (component.production_recipe_id ?? null)
            : null,
        recipe_quantity: component.recipe_quantity,
        uom_id: component.uom_id,
      })),
    }
  )

  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/menu`)
  return menuItemId as string
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

/**
 * Creates a new recipe version for a menu item using the DB RPC.
 * The RPC handles: version numbering, component insertion, yield-adjusted-quantity
 * computation, production_recipe_version_id freezing, and updating
 * menu_items.current_recipe_version_id automatically.
 * Returns the new version id on success.
 */
export async function createMenuItemRecipeVersion(data: {
  kitchen_id: string
  menu_item_id: string
  components: RecipeComponentInput[]
}): Promise<string | Error> {
  const supabase = await createClient()
  const { kitchen_id, menu_item_id, components } = data

  const { data: versionId, error } = await supabase.rpc(
    'create_menu_item_recipe_version',
    {
      p_kitchen_id: kitchen_id,
      p_menu_item_id: menu_item_id,
      p_components: components.map((c) => ({
        component_type: c.component_type,
        inventory_item_id:
          c.component_type === 'inventory_item'
            ? (c.inventory_item_id ?? null)
            : null,
        production_recipe_id:
          c.component_type === 'production_recipe'
            ? (c.production_recipe_id ?? null)
            : null,
        recipe_quantity: c.recipe_quantity,
        uom_id: c.uom_id,
      })),
    }
  )

  if (error) return new Error(error.message)

  revalidatePath(`/${kitchen_id}/menu`)
  return versionId as string
}
