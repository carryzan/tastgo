'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface ItemSupplierRow {
  supplier_id: string
  current_unit_cost: number
  is_preferred: boolean
  is_active: boolean
}

export async function replaceItemSuppliers(
  inventoryItemId: string,
  kitchenId: string,
  rows: ItemSupplierRow[]
) {
  const supabase = await createClient()

  const { error: delError } = await supabase
    .from('inventory_item_suppliers')
    .delete()
    .eq('inventory_item_id', inventoryItemId)
    .eq('kitchen_id', kitchenId)
  if (delError) return new Error(delError.message)

  if (rows.length > 0) {
    const { error: insError } = await supabase.from('inventory_item_suppliers').insert(
      rows.map((r) => ({
        kitchen_id: kitchenId,
        inventory_item_id: inventoryItemId,
        supplier_id: r.supplier_id,
        current_unit_cost: r.current_unit_cost,
        is_preferred: r.is_preferred,
        is_active: r.is_active,
      }))
    )
    if (insError) return new Error(insError.message)
  }

  revalidatePath(`/${kitchenId}/inventory`)
}
