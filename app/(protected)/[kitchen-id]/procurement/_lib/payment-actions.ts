'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreatePaymentData {
  kitchen_id: string
  supplier_id: string
  amount: number
  settlement_account_id: string
  payment_date?: string
}

interface PaymentAllocation {
  purchase_id: string
  amount: number
}

export async function createSupplierPayment(data: CreatePaymentData) {
  const supabase = await createClient()

  const paymentDate = data.payment_date ?? new Date().toISOString().split('T')[0]

  const { error } = await supabase.rpc('create_supplier_payment', {
    p_kitchen_id: data.kitchen_id,
    p_supplier_id: data.supplier_id,
    p_amount: data.amount,
    p_settlement_account_id: data.settlement_account_id,
    p_payment_date: paymentDate,
  })
  if (error) return new Error(error.message)

  revalidatePath(`/${data.kitchen_id}/procurement`)
  revalidatePath(`/${data.kitchen_id}/cash`)
}

export async function allocatePayment(
  kitchenId: string,
  paymentId: string,
  allocations: PaymentAllocation[]
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('allocate_supplier_payment', {
    p_kitchen_id: kitchenId,
    p_payment_id: paymentId,
    p_allocations: allocations,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function unallocatePayment(
  kitchenId: string,
  allocationId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('unallocate_supplier_payment', {
    p_kitchen_id: kitchenId,
    p_allocation_id: allocationId,
    p_reason: reason,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function reversePayment(
  kitchenId: string,
  paymentId: string,
  reason: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reverse_supplier_payment', {
    p_kitchen_id: kitchenId,
    p_payment_id: paymentId,
    p_reason: reason,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}
