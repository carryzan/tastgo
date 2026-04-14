'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateCashAccountData {
  name: string
}

interface UpdateCashAccountData {
  name?: string
  is_active?: boolean
}

interface CreateTransactionData {
  cash_account_id: string
  type: 'deposit' | 'withdrawal' | 'transfer'
  amount: number
  reason?: string
  transfer_to_account_id?: string
  membership_id: string
}

export async function createCashAccount(
  kitchenId: string,
  data: CreateCashAccountData
) {
  const supabase = await createClient()
  const { error } = await supabase.from('cash_accounts').insert({
    kitchen_id: kitchenId,
    name: data.name,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}

export async function updateCashAccount(
  kitchenId: string,
  accountId: string,
  data: UpdateCashAccountData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cash_accounts')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}

export async function deleteCashAccount(kitchenId: string, accountId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cash_accounts')
    .delete()
    .eq('id', accountId)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}

export async function createCashAccountTransaction(
  kitchenId: string,
  data: CreateTransactionData
) {
  const supabase = await createClient()

  const { error } = await supabase.from('cash_account_transactions').insert({
    kitchen_id: kitchenId,
    cash_account_id: data.cash_account_id,
    type: data.type,
    amount: data.amount,
    reason: data.reason ?? null,
    source_type: null,
    source_id: null,
    transfer_to_account_id:
      data.type === 'transfer' ? (data.transfer_to_account_id ?? null) : null,
    created_by: data.membership_id,
  })

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}
