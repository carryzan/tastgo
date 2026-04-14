'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface ReturnLineItem {
  inventory_item_id: string
  batch_id: string
  returned_quantity: number
}

interface CreateReturnData {
  kitchen_id: string
  purchase_id: string
  supplier_id: string
  created_by: string
  items: ReturnLineItem[]
}

export async function createSupplierReturn(data: CreateReturnData) {
  const supabase = await createClient()

  const { data: supplierReturn, error: returnError } = await supabase
    .from('supplier_returns')
    .insert({
      kitchen_id: data.kitchen_id,
      purchase_id: data.purchase_id,
      supplier_id: data.supplier_id,
      status: 'pending',
      created_by: data.created_by,
    })
    .select('id')
    .single()

  if (returnError) return new Error(returnError.message)

  if (data.items.length > 0) {
    const { error: itemsError } = await supabase
      .from('supplier_return_items')
      .insert(
        data.items.map((item) => ({
          kitchen_id: data.kitchen_id,
          supplier_return_id: supplierReturn.id,
          inventory_item_id: item.inventory_item_id,
          batch_id: item.batch_id,
          returned_quantity: item.returned_quantity,
          unit_cost: 0,
          line_credit_value: 0,
        }))
      )
    if (itemsError) return new Error(itemsError.message)
  }

  revalidatePath(`/${data.kitchen_id}/procurement`)
}

export async function approveSupplierReturn(kitchenId: string, returnId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('supplier_returns')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', returnId)
    .eq('kitchen_id', kitchenId)
    .eq('status', 'pending')
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}
