import { createClient } from '@/lib/supabase/client'

export const COUNTABLE_STOCK_QUERY_KEY = ['stock-control-countable-stock']

export interface CountableStockRow {
  id: string
  kitchen_id: string
  item_type: 'inventory_item' | 'production_recipe'
  inventory_item_id: string | null
  production_recipe_id: string | null
  name: string
  group_label: string
  location_label: string | null
  category_name: string | null
  cycle_count_frequency: string | null
  par_level: string | number | null
  min_level: string | number | null
  max_level: string | number | null
  storage_uom_id: string | null
  storage_uom_name: string | null
  storage_uom_abbreviation: string | null
  count_uom_label: string | null
  current_quantity: string | number
  latest_unit_cost: string | number | null
  stock_value: string | number
}

export async function fetchCountableStockItems(
  kitchenId: string
): Promise<CountableStockRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('v_stock_control_countable_stock')
    .select('*')
    .eq('kitchen_id', kitchenId)
    .order('group_label', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CountableStockRow[]
}
