'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createServicePeriod(data: {
  kitchen_id: string
  name: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('production_service_periods')
    .insert(data)
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/production`)
}

export async function updateServicePeriod(
  id: string,
  kitchenId: string,
  updates: { name?: string; is_active?: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('production_service_periods')
    .update(updates)
    .eq('id', id)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/production`)
}

export async function deleteServicePeriod(id: string, kitchenId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('production_service_periods')
    .delete()
    .eq('id', id)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/production`)
}
