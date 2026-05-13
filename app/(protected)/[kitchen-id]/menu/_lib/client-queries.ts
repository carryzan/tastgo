import { createClient } from '@/lib/supabase/client'

export interface InventoryItemPick {
  id: string
  name: string
  yield_percentage: number
  storage_uom_id: string | null
}

export interface InventoryItemBasicPick {
  id: string
  name: string
  storage_uom_id: string | null
}

export interface ProductionRecipePick {
  id: string
  name: string
  storage_uom_id: string | null
}

export interface MenuItemPick {
  id: string
  name: string
  price: number | string
}

export interface ModifierGroupPick {
  id: string
  name: string
  is_active: boolean
}

export interface ModifierGroupLink {
  modifier_group_id: string
  sort_order: number
}

export interface MenuRecipeComponent {
  id: string
  component_type: string
  recipe_quantity: string
  yield_adjusted_quantity: string
  production_recipe_version_id: string | null
  inventory_items?: { name: string } | { name: string }[] | null
  production_recipes?: { name: string } | { name: string }[] | null
  production_recipe_versions?: { version_number: number } | { version_number: number }[] | null
  units_of_measure?:
    | { abbreviation: string }
    | { abbreviation: string }[]
    | null
}

export async function fetchActiveInventoryItems(kitchenId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, yield_percentage, storage_uom_id')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as InventoryItemPick[]
}

export async function fetchActiveInventoryItemPicks(kitchenId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, storage_uom_id')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as InventoryItemBasicPick[]
}

export async function fetchActiveProductionRecipes(kitchenId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('production_recipes')
    .select('id, name, storage_uom_id')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .eq('track_stock', true)
    .not('current_version_id', 'is', null)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ProductionRecipePick[]
}

export async function fetchRecipeVersionComponents(versionId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_item_recipe_components')
    .select(
      'id, component_type, recipe_quantity, yield_adjusted_quantity, production_recipe_version_id, inventory_items(name), production_recipes(name), production_recipe_versions:production_recipe_version_id(version_number), units_of_measure(abbreviation)'
    )
    .eq('recipe_version_id', versionId)
  if (error) throw new Error(error.message)
  return (data ?? []) as MenuRecipeComponent[]
}

export async function fetchModifierGroupsForBrand(
  kitchenId: string,
  brandId: string
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('modifier_groups')
    .select('id, name, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('brand_id', brandId)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ModifierGroupPick[]
}

export async function fetchMenuItemModifierLinks(menuItemId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_item_modifier_groups')
    .select('modifier_group_id, sort_order')
    .eq('menu_item_id', menuItemId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    modifier_group_id: String(r.modifier_group_id),
    sort_order: Number(r.sort_order),
  }))
}

export async function fetchModifierOptions(
  groupId: string,
  kitchenId: string
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('modifier_options')
    .select('*')
    .eq('modifier_group_id', groupId)
    .eq('kitchen_id', kitchenId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchMenuItemPicksForBrand(
  kitchenId: string,
  brandId: string
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, price')
    .eq('kitchen_id', kitchenId)
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as MenuItemPick[]
}
