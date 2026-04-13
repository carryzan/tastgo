import { createClient } from '@/lib/supabase/server'

export interface Menu {
  id: string
  kitchen_id: string
  brand_id: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export async function getMenus(kitchenId: string): Promise<Menu[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as Menu[]
}
