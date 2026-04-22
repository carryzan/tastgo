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
  items: ReturnLineItem[]
}

export async function createSupplierReturn(data: CreateReturnData) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('create_supplier_return', {
    p_kitchen_id: data.kitchen_id,
    p_purchase_id: data.purchase_id,
    p_supplier_id: data.supplier_id,
    p_items: data.items.map((item) => ({
      inventory_item_id: item.inventory_item_id,
      batch_id: item.batch_id,
      returned_quantity: item.returned_quantity,
    })),
  })

  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/procurement`)
}

export async function approveSupplierReturn(kitchenId: string, returnId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('approve_supplier_return', {
    p_kitchen_id: kitchenId,
    p_supplier_return_id: returnId,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function issueCreditNoteFromReturn(kitchenId: string, returnId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('issue_supplier_credit_note_from_return', {
    p_kitchen_id: kitchenId,
    p_supplier_return_id: returnId,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}
