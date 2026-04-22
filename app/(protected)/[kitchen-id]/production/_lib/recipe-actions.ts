'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface RecipeComponent {
  inventory_item_id: string
  recipe_quantity: number
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
  components: RecipeComponent[]
}) {
  const supabase = await createClient()
  const { kitchen_id, production_recipe_id, components } = data

  const { error } = await supabase.rpc('create_production_recipe_version', {
    p_kitchen_id: kitchen_id,
    p_production_recipe_id: production_recipe_id,
    p_components: components.map((c) => ({
      inventory_item_id: c.inventory_item_id,
      recipe_quantity: c.recipe_quantity,
      uom_id: c.uom_id,
    })),
  })

  if (error) return new Error(error.message)

  revalidatePath('/[kitchen-id]', 'layout')
}
