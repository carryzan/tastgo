'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreatePaymentData {
  kitchen_id: string
  reference_purchase_id: string
  supplier_id: string
  amount: number
  settlement_account_id: string
}

export async function createSupplierPayment(data: CreatePaymentData) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.rpc('create_supplier_payment', {
    p_kitchen_id: data.kitchen_id,
    p_supplier_id: data.supplier_id,
    p_amount: data.amount,
    p_settlement_account_id: data.settlement_account_id,
    p_reference_purchase_id: data.reference_purchase_id,
    p_payment_date: today,
  })

  if (error) return new Error(error.message)

  revalidatePath(`/${data.kitchen_id}/procurement`)
  revalidatePath(`/${data.kitchen_id}/cash`)
}
