'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createSource(data: { kitchen_id: string; name: string; type: string; logo_url: string | null }) {
  const supabase = await createClient()
  const { error } = await supabase.from('sources').insert(data)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function updateSource(id: string, updates: { name?: string; type?: string; logo_url?: string | null; is_active?: boolean }) {
  const supabase = await createClient()
  const { error } = await supabase.from('sources').update(updates).eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function deleteSource(id: string) {
  const supabase = await createClient()

  const { data: source } = await supabase
    .from('sources')
    .select('logo_url')
    .eq('id', id)
    .single()

  if (source?.logo_url) {
    const path = source.logo_url.split('/kitchen-assets/')[1]
    if (path) await supabase.storage.from('kitchen-assets').remove([path])
  }

  const { error } = await supabase.from('sources').delete().eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
