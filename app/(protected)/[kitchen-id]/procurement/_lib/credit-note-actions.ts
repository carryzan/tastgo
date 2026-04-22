'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreditAllocation {
  purchase_id: string
  amount: number
}

interface CreateManualCreditNoteData {
  kitchen_id: string
  supplier_id: string
  credit_value: number
  offset_account_id: string
  note: string
}

export async function createManualSupplierCreditNote(data: CreateManualCreditNoteData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_manual_supplier_credit_note', {
    p_kitchen_id: data.kitchen_id,
    p_supplier_id: data.supplier_id,
    p_credit_value: data.credit_value,
    p_offset_account_id: data.offset_account_id,
    p_note: data.note,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/procurement`)
  revalidatePath(`/${data.kitchen_id}/finance`)
  revalidatePath(`/${data.kitchen_id}/cash`)
}

export async function allocateCredit(
  kitchenId: string,
  creditNoteId: string,
  allocations: CreditAllocation[]
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('allocate_supplier_credit', {
    p_kitchen_id: kitchenId,
    p_credit_note_id: creditNoteId,
    p_allocations: allocations,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function unallocateCredit(
  kitchenId: string,
  allocationId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('unallocate_supplier_credit', {
    p_kitchen_id: kitchenId,
    p_allocation_id: allocationId,
    p_reason: reason,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function refundCredit(
  kitchenId: string,
  creditNoteId: string,
  settlementAccountId: string,
  amount: number
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('refund_supplier_credit', {
    p_kitchen_id: kitchenId,
    p_credit_note_id: creditNoteId,
    p_settlement_account_id: settlementAccountId,
    p_amount: amount,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function reverseCreditNote(
  kitchenId: string,
  creditNoteId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reverse_supplier_credit_note', {
    p_kitchen_id: kitchenId,
    p_credit_note_id: creditNoteId,
    p_reason: reason,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function reverseCreditRefund(
  kitchenId: string,
  refundId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reverse_supplier_credit_refund', {
    p_kitchen_id: kitchenId,
    p_refund_id: refundId,
    p_reason: reason,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}
