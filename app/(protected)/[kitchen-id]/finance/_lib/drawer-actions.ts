'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface AddCashInData {
  sessionId: string
  amount: number
  sourceAccountId: string
  reason?: string
}

interface AddCashOutData {
  sessionId: string
  amount: number
  destinationAccountId: string
  reason?: string
}

interface CloseDrawerData {
  sessionId: string
  actualCloseAmount: number
  reason?: string
  closeDate: string
}

export async function addCashIn(kitchenId: string, data: AddCashInData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('add_cash_in', {
    p_kitchen_id: kitchenId,
    p_session_id: data.sessionId,
    p_amount: data.amount,
    p_source_account_id: data.sourceAccountId,
    p_reason: data.reason ?? null,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/finance`)
}

export async function addCashOut(kitchenId: string, data: AddCashOutData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('add_cash_out', {
    p_kitchen_id: kitchenId,
    p_session_id: data.sessionId,
    p_amount: data.amount,
    p_destination_account_id: data.destinationAccountId,
    p_reason: data.reason ?? null,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/finance`)
}

export async function closeDrawerSession(
  kitchenId: string,
  data: CloseDrawerData
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('close_cash_drawer', {
    p_kitchen_id: kitchenId,
    p_session_id: data.sessionId,
    p_actual_close_amount: data.actualCloseAmount,
    p_close_date: data.closeDate,
    p_reason: data.reason ?? null,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/finance`)
}

export async function reopenDrawerSession(
  kitchenId: string,
  sessionId: string,
  reason: string
) {
  if (!reason.trim()) return new Error('A reason is required to reopen a session.')
  const supabase = await createClient()
  const { error } = await supabase.rpc('reopen_cash_drawer', {
    p_kitchen_id: kitchenId,
    p_session_id: sessionId,
    p_reason: reason,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/finance`)
}

export async function undoDrawerTransaction(
  kitchenId: string,
  transactionId: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('undo_cash_transaction', {
    p_kitchen_id: kitchenId,
    p_transaction_id: transactionId,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/finance`)
}
