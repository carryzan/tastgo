'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface TransferData {
  fromAccountId: string
  toAccountId: string
  amount: number
  reason?: string
  transferDate: string
}

export async function transferCashBetweenAccounts(
  kitchenId: string,
  data: TransferData
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('transfer_cash_between_accounts', {
    p_kitchen_id: kitchenId,
    p_from_account_id: data.fromAccountId,
    p_to_account_id: data.toAccountId,
    p_amount: data.amount,
    p_reason: data.reason ?? null,
    p_transfer_date: data.transferDate,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}
