import { createClient } from '@/lib/supabase/server'
import type { CountableStockRow } from './client-queries'

interface MemberDisplay {
  id: string
  profiles: { full_name: string | null } | null
}

export interface StockCountSessionDetail {
  id: string
  kitchen_id: string
  type: 'full' | 'spot'
  status: 'in_progress' | 'completed'
  created_by: string
  completed_by: string | null
  created_at: string
  completed_at: string | null
  created_member: MemberDisplay | null
  completed_member: MemberDisplay | null
}

export interface StockCountDetailItem {
  id: string
  kitchen_id: string
  session_id: string
  item_type: 'inventory_item' | 'production_recipe'
  inventory_item_id: string | null
  production_recipe_id: string | null
  theoretical_quantity: string | number
  counted_quantity: string | number
  variance_quantity: string | number
  variance_direction: 'negative' | 'positive' | 'none'
  variance_value: string | number
  adjustment_reason: string | null
  counted_at: string | null
  counted_by: string | null
  created_at: string
  stock: CountableStockRow | null
}

interface StockCountItemRow {
  id: string
  kitchen_id: string
  session_id: string
  item_type: 'inventory_item' | 'production_recipe'
  inventory_item_id: string | null
  production_recipe_id: string | null
  theoretical_quantity: string | number
  counted_quantity: string | number
  variance_quantity: string | number
  variance_direction: 'negative' | 'positive' | 'none'
  variance_value: string | number
  adjustment_reason: string | null
  counted_at: string | null
  counted_by: string | null
  created_at: string
}

function stockKey(row: Pick<CountableStockRow, 'item_type' | 'inventory_item_id' | 'production_recipe_id'>) {
  return row.item_type === 'inventory_item'
    ? `inventory_item:${row.inventory_item_id}`
    : `production_recipe:${row.production_recipe_id}`
}

function itemKey(row: Pick<StockCountItemRow, 'item_type' | 'inventory_item_id' | 'production_recipe_id'>) {
  return row.item_type === 'inventory_item'
    ? `inventory_item:${row.inventory_item_id}`
    : `production_recipe:${row.production_recipe_id}`
}

export async function getStockCountDetail(
  kitchenId: string,
  sessionId: string
) {
  const supabase = await createClient()

  const [sessionResult, itemsResult, stockResult] = await Promise.all([
    supabase
      .from('stock_count_sessions')
      .select(
        '*, created_member:kitchen_members!created_by(id, profiles(full_name)), completed_member:kitchen_members!completed_by(id, profiles(full_name))'
      )
      .eq('kitchen_id', kitchenId)
      .eq('id', sessionId)
      .single(),
    supabase
      .from('stock_count_session_items')
      .select('*')
      .eq('kitchen_id', kitchenId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }),
    supabase
      .from('v_stock_control_countable_stock')
      .select('*')
      .eq('kitchen_id', kitchenId),
  ])

  if (sessionResult.error) throw new Error(sessionResult.error.message)
  if (itemsResult.error) throw new Error(itemsResult.error.message)
  if (stockResult.error) throw new Error(stockResult.error.message)

  const stockByKey = new Map<string, CountableStockRow>()
  for (const row of (stockResult.data ?? []) as CountableStockRow[]) {
    stockByKey.set(stockKey(row), row)
  }

  const items = ((itemsResult.data ?? []) as StockCountItemRow[]).map((item) => ({
    ...item,
    stock: stockByKey.get(itemKey(item)) ?? null,
  }))

  return {
    session: sessionResult.data as StockCountSessionDetail,
    items,
  }
}
