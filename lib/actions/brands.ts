'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createBrand(data: { kitchen_id: string; name: string; logo_url: string | null }) {
  const supabase = await createClient()
  const { error } = await supabase.from('brands').insert(data)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function updateBrand(id: string, updates: { name?: string; logo_url?: string | null; is_active?: boolean }) {
  const supabase = await createClient()
  const { error } = await supabase.from('brands').update(updates).eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function deleteBrand(id: string) {
  const supabase = await createClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('logo_url')
    .eq('id', id)
    .single()

  if (brand?.logo_url) {
    const path = brand.logo_url.split('/kitchen-assets/')[1]
    if (path) await supabase.storage.from('kitchen-assets').remove([path])
  }

  const { error } = await supabase.from('brands').delete().eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}