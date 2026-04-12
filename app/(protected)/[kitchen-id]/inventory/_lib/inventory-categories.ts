import { createClient } from '@/lib/supabase/server'

export interface InventoryCategory {
  id: string
  kitchen_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getInventoryCategories(
  kitchenId: string
): Promise<InventoryCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as InventoryCategory[]
}
