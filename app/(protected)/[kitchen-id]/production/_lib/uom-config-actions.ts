'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ProductionRecipeUomConversionInput {
  id?: string
  uom_id: string
  factor_to_storage: number
  allow_production: boolean
  allow_recipe: boolean
  allow_count: boolean
  allow_waste: boolean
  allow_opening: boolean
  is_default_production: boolean
  is_default_recipe: boolean
  is_default_count: boolean
  is_default_waste: boolean
  is_default_opening: boolean
}

export async function saveProductionRecipeUomConfiguration(data: {
  kitchen_id: string
  production_recipe_id: string
  storage_uom_id: string
  conversions: ProductionRecipeUomConversionInput[]
}) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('save_production_recipe_uom_configuration', {
    p_kitchen_id: data.kitchen_id,
    p_production_recipe_id: data.production_recipe_id,
    p_storage_uom_id: data.storage_uom_id,
    p_conversions: data.conversions,
  })

  if (error) return new Error(error.message)

  revalidatePath('/[kitchen-id]', 'layout')
}
