'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createModifierGroup(data: {
  kitchen_id: string
  brand_id: string
  name: string
  min_selections?: number
  max_selections: number | null
}) {
  const supabase = await createClient()
  const { min_selections = 0, ...rest } = data
  const { error } = await supabase.from('modifier_groups').insert({
    ...rest,
    min_selections,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/menu`)
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
