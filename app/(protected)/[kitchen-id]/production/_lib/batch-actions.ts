'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateBatchData {
  kitchen_id: string
  production_recipe_id: string
  recipe_version_id: string
  service_period_id: string | null
  target_quantity: number
  created_by: string
}

export async function createBatch(data: CreateBatchData) {
  const supabase = await createClient()
  const { error } = await supabase.from('production_batches').insert(data)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function completeBatch(
  id: string,
  kitchenId: string,
  actualQuantity: number
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('production_batches')
    .update({ actual_quantity: actualQuantity })
    .eq('id', id)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function deleteBatch(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('production_batches')
    .delete()
    .eq('id', id)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
