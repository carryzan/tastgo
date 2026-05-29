import { createClient } from '@/lib/supabase/client'
import type { PosCatalogPackagingItem } from '@/lib/types/orders'

export async function fetchActivePackagingItems(
  kitchenId: string
): Promise<PosCatalogPackagingItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('packaging_items')
    .select(
      `id,
      kitchen_id,
      inventory_item_id,
      name,
      default_quantity,
      auto_add,
      source_type_scope,
      sort_order,
      is_active,
      inventory_item:inventory_items!inventory_item_id(id, name)`
    )
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as PosCatalogPackagingItem[]
}
