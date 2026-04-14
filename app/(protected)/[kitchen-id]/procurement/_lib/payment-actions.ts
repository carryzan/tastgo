'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreatePaymentData {
  kitchen_id: string
  purchase_id: string
  supplier_id: string
  amount: number
  cash_account_id: string
  paid_by: string
}

export async function createSupplierPayment(data: CreatePaymentData) {
  const supabase = await createClient()

  const { data: transaction, error: txError } = await supabase
    .from('cash_account_transactions')
    .insert({
      kitchen_id: data.kitchen_id,
      cash_account_id: data.cash_account_id,
      type: 'withdrawal',
      amount: data.amount,
      source_type: 'supplier_payment',
      created_by: data.paid_by,
    })
    .select('id')
    .single()

  if (txError) return new Error(txError.message)

  const { error: paymentError } = await supabase.from('supplier_payments').insert({
    kitchen_id: data.kitchen_id,
    purchase_id: data.purchase_id,
    supplier_id: data.supplier_id,
    amount: data.amount,
    cash_account_id: data.cash_account_id,
    cash_transaction_id: transaction.id,
    outstanding_balance: 0,
    paid_by: data.paid_by,
  })

  if (paymentError) return new Error(paymentError.message)

  revalidatePath(`/${data.kitchen_id}/procurement`)
  revalidatePath(`/${data.kitchen_id}/cash`)
}
