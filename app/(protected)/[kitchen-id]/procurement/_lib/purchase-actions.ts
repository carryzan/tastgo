'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface PurchaseLineItem {
  inventory_item_id: string
  ordered_quantity: number
  unit_cost: number
}

interface UpdatePurchaseData {
  supplier_id?: string
  supplier_invoice_code?: string | null
}

interface ReceivePurchaseItem {
  purchase_item_id: string
  received_quantity: number
}

export async function createPurchase(
  kitchenId: string,
  supplierId: string,
  items: PurchaseLineItem[],
  supplierInvoiceCode?: string | null
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_purchase', {
    p_kitchen_id: kitchenId,
    p_supplier_id: supplierId,
    p_items: items.map((item) => ({
      inventory_item_id: item.inventory_item_id,
      ordered_quantity: item.ordered_quantity,
      unit_cost: item.unit_cost,
    })),
  })

  if (error) return new Error(error.message)

  // Supplier invoice code is not supported by the RPC directly — update separately if provided
  if (supplierInvoiceCode && data) {
    const { error: updateError } = await supabase
      .from('purchases')
      .update({ supplier_invoice_code: supplierInvoiceCode })
      .eq('id', data as string)
      .eq('kitchen_id', kitchenId)
      .eq('status', 'draft')
    if (updateError) return new Error(updateError.message)
  }

  revalidatePath(`/${kitchenId}/procurement`)
}

export async function updatePurchase(
  kitchenId: string,
  purchaseId: string,
  data: UpdatePurchaseData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('purchases')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', purchaseId)
    .eq('kitchen_id', kitchenId)
    .eq('status', 'draft')
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function replacePurchaseItems(
  kitchenId: string,
  purchaseId: string,
  items: PurchaseLineItem[]
) {
  const supabase = await createClient()

  const { error: delError } = await supabase
    .from('purchase_items')
    .delete()
    .eq('purchase_id', purchaseId)
    .eq('kitchen_id', kitchenId)
  if (delError) return new Error(delError.message)

  if (items.length > 0) {
    const { error: insError } = await supabase.from('purchase_items').insert(
      items.map((item) => ({
        kitchen_id: kitchenId,
        purchase_id: purchaseId,
        inventory_item_id: item.inventory_item_id,
        ordered_quantity: item.ordered_quantity,
        unit_cost: item.unit_cost,
        line_total: 0,
      }))
    )
    if (insError) return new Error(insError.message)
  }

  revalidatePath(`/${kitchenId}/procurement`)
}

export async function markPurchaseSent(kitchenId: string, purchaseId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('send_purchase', {
    p_kitchen_id: kitchenId,
    p_purchase_id: purchaseId,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function receivePurchase(
  kitchenId: string,
  purchaseId: string,
  items: ReceivePurchaseItem[]
) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('receive_purchase', {
    p_kitchen_id: kitchenId,
    p_purchase_id: purchaseId,
    p_items: items.map((item) => ({
      purchase_item_id: item.purchase_item_id,
      received_quantity: item.received_quantity,
    })),
  })

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function reassignPurchaseSupplier(
  kitchenId: string,
  purchaseId: string,
  toSupplierId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reassign_purchase_supplier', {
    p_kitchen_id: kitchenId,
    p_purchase_id: purchaseId,
    p_to_supplier_id: toSupplierId,
    p_reason: reason,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}
