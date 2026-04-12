'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createUOM(data: {
  kitchen_id: string
  name: string
  abbreviation: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('units_of_measure').insert(data)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function updateUOM(
  id: string,
  updates: { name?: string; abbreviation?: string; is_active?: boolean },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('units_of_measure')
    .update(updates)
    .eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function deleteUOM(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('units_of_measure')
    .delete()
    .eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
