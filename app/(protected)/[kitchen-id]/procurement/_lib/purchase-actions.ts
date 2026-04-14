'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface PurchaseLineItem {
  inventory_item_id: string
  ordered_quantity: number
  unit_cost: number
}

interface CreatePurchaseData {
  kitchen_id: string
  supplier_id: string
  supplier_invoice_code?: string
  created_by: string
  items: PurchaseLineItem[]
}

interface UpdatePurchaseData {
  supplier_id?: string
  supplier_invoice_code?: string | null
}

interface ReceivePurchaseItem {
  purchase_item_id: string
  received_quantity: number
}

export async function createPurchase(data: CreatePurchaseData) {
  const supabase = await createClient()

  const { data: purchase, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      kitchen_id: data.kitchen_id,
      supplier_id: data.supplier_id,
      supplier_invoice_code: data.supplier_invoice_code ?? null,
      status: 'draft',
      created_by: data.created_by,
    })
    .select('id')
    .single()

  if (purchaseError) return new Error(purchaseError.message)

  if (data.items.length > 0) {
    const { error: itemsError } = await supabase.from('purchase_items').insert(
      data.items.map((item) => ({
        kitchen_id: data.kitchen_id,
        purchase_id: purchase.id,
        inventory_item_id: item.inventory_item_id,
        ordered_quantity: item.ordered_quantity,
        unit_cost: item.unit_cost,
        line_total: 0,
      }))
    )
    if (itemsError) return new Error(itemsError.message)
  }

  revalidatePath(`/${data.kitchen_id}/procurement`)
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
  const { error } = await supabase
    .from('purchases')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .eq('kitchen_id', kitchenId)
    .eq('status', 'draft')
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function receivePurchase(
  kitchenId: string,
  purchaseId: string,
  receivedBy: string,
  items: ReceivePurchaseItem[]
) {
  const supabase = await createClient()

  for (const item of items) {
    const { error } = await supabase
      .from('purchase_items')
      .update({ received_quantity: item.received_quantity })
      .eq('id', item.purchase_item_id)
      .eq('purchase_id', purchaseId)
    if (error) return new Error(error.message)
  }

  const { error } = await supabase
    .from('purchases')
    .update({
      status: 'received',
      received_at: new Date().toISOString(),
      received_by: receivedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .eq('kitchen_id', kitchenId)
    .eq('status', 'sent')
  if (error) return new Error(error.message)

  revalidatePath(`/${kitchenId}/procurement`)
}
