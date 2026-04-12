import { createClient } from '@/lib/supabase/server'

export async function getKitchen(kitchenId: string) {
  const supabase = await createClient()
  return supabase
    .from('kitchens')
    .select('*')
    .eq('id', kitchenId)
    .single()
}

export async function getKitchenSettings(kitchenId: string) {
  const supabase = await createClient()
  return supabase
    .from('kitchen_settings')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .single()
}

export async function getKitchenMembers(kitchenId: string) {
  const supabase = await createClient()
  return supabase
    .from('kitchen_members')
    .select('*, profiles(*), roles(name)')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
}

export async function getKitchenBrands(kitchenId: string) {
  const supabase = await createClient()
  return supabase
    .from('brands')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
}

export async function getKitchenSources(kitchenId: string) {
  const supabase = await createClient()
  return supabase
    .from('sources')
    .select('*, source_fees(*)')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
}

export async function getKitchenUOM(kitchenId: string) {
  const supabase = await createClient()
  return supabase
    .from('units_of_measure')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
}
