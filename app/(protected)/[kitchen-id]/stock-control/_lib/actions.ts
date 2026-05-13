'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface StockCountCreateItem {
  item_type: 'inventory_item' | 'production_recipe'
  inventory_item_id: string | null
  production_recipe_id: string | null
}

interface WasteLogData {
  kitchenId: string
  itemType: 'inventory_item' | 'production_recipe'
  inventoryItemId: string | null
  productionRecipeId: string | null
  quantity: number
  uomId?: string | null
  reason: string | null
}

export async function createStockCount(
  kitchenId: string,
  type: 'full' | 'spot',
  items: StockCountCreateItem[]
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_stock_count', {
    p_kitchen_id: kitchenId,
    p_type: type,
    p_items: items,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
  return data as string
}

export async function updateStockCountItem(
  kitchenId: string,
  itemId: string,
  countedQuantity: number,
  adjustmentReason: string | null,
  countedUomId?: string | null
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('update_stock_count_item', {
    p_kitchen_id: kitchenId,
    p_item_id: itemId,
    p_counted_quantity: countedQuantity,
    p_adjustment_reason: adjustmentReason,
    p_counted_uom_id: countedUomId ?? null,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
  return data[0]
}

export async function completeStockCount(kitchenId: string, sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('complete_stock_count', {
    p_kitchen_id: kitchenId,
    p_session_id: sessionId,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function recordWasteLog(data: WasteLogData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('record_waste_log', {
    p_kitchen_id: data.kitchenId,
    p_item_type: data.itemType,
    p_inventory_item_id: data.inventoryItemId,
    p_production_recipe_id: data.productionRecipeId,
    p_quantity: data.quantity,
    p_uom_id: data.uomId ?? null,
    p_reason: data.reason,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function reverseWasteLog(
  kitchenId: string,
  wasteEntryId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reverse_waste_log', {
    p_kitchen_id: kitchenId,
    p_waste_entry_id: wasteEntryId,
    p_reason: reason,
  })

  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}
