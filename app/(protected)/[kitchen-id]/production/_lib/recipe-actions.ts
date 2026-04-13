'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface RecipeComponent {
  inventory_item_id: string
  recipe_quantity: number
  yield_adjusted_quantity: number
  uom_id: string
}

interface CreateRecipeData {
  kitchen_id: string
  name: string
  track_stock: boolean
  variance_tolerance_percentage: number | null
}

interface UpdateRecipeData {
  name?: string
  variance_tolerance_percentage?: number | null
  is_active?: boolean
}

export async function createRecipe(data: CreateRecipeData) {
  const supabase = await createClient()
  const { kitchen_id, name, track_stock, variance_tolerance_percentage } = data

  const { error } = await supabase
    .from('production_recipes')
    .insert({ kitchen_id, name, track_stock, variance_tolerance_percentage })

  if (error) return new Error(error.message)

  revalidatePath('/[kitchen-id]', 'layout')
}

export async function updateRecipe(
  id: string,
  kitchenId: string,
  updates: UpdateRecipeData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('production_recipes')
    .update(updates)
    .eq('id', id)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function deleteRecipe(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('production_recipes')
    .delete()
    .eq('id', id)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function createRecipeVersion(data: {
  kitchen_id: string
  production_recipe_id: string
  created_by: string
  components: RecipeComponent[]
}) {
  const supabase = await createClient()
  const { kitchen_id, production_recipe_id, created_by, components } = data

  const { data: maxData, error: maxError } = await supabase
    .from('production_recipe_versions')
    .select('version_number')
    .eq('production_recipe_id', production_recipe_id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxError) return new Error(maxError.message)

  const nextVersion = (maxData?.version_number ?? 0) + 1

  const { data: version, error: versionError } = await supabase
    .from('production_recipe_versions')
    .insert({ kitchen_id, production_recipe_id, version_number: nextVersion, created_by })
    .select('id')
    .single()

  if (versionError) return new Error(versionError.message)

  if (components.length > 0) {
    const { error: componentsError } = await supabase
      .from('production_recipe_components')
      .insert(
        components.map((c) => ({
          kitchen_id,
          recipe_version_id: version.id,
          inventory_item_id: c.inventory_item_id,
          recipe_quantity: c.recipe_quantity,
          yield_adjusted_quantity: c.yield_adjusted_quantity,
          uom_id: c.uom_id,
        }))
      )
    if (componentsError) return new Error(componentsError.message)
  }

  const { error: updateError } = await supabase
    .from('production_recipes')
    .update({ current_version_id: version.id })
    .eq('id', production_recipe_id)

  if (updateError) return new Error(updateError.message)

  revalidatePath('/[kitchen-id]', 'layout')
}
