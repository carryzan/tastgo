import { createClient } from '@/lib/supabase/client'

export interface SupplierOption {
  id: string
  name: string
  is_active: boolean
}

export interface ItemSupplierLink {
  id: string
  supplier_id: string
  current_unit_cost: string | number
  is_preferred: boolean
  is_active: boolean
}

export async function fetchSuppliersForKitchen(kitchenId: string): Promise<SupplierOption[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, is_active')
    .eq('kitchen_id', kitchenId)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as SupplierOption[]
}

export async function fetchItemSupplierLinks(inventoryItemId: string): Promise<ItemSupplierLink[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory_item_suppliers')
    .select('id, supplier_id, current_unit_cost, is_preferred, is_active')
    .eq('inventory_item_id', inventoryItemId)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ItemSupplierLink[]
}
