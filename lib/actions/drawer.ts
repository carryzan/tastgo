'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface AddCashInInput {
  sessionId: string
  amount: number
  sourceAccountId: string
  reason?: string | null
}

interface AddCashOutInput {
  sessionId: string
  amount: number
  destinationAccountId: string
  reason?: string | null
}

interface CloseDrawerInput {
  sessionId: string
  actualCloseAmount: number
  closeDate: string
  reason?: string | null
}

function revalidateDrawerRoutes(kitchenId: string) {
  revalidatePath(`/${kitchenId}/point-of-sale`)
  revalidatePath(`/${kitchenId}/finance`)
  revalidatePath(`/${kitchenId}/orders`)
}

export async function openDrawerSession(
  kitchenId: string,
  drawerAccountId: string
): Promise<string | Error> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('open_cash_drawer', {
    p_kitchen_id: kitchenId,
    p_drawer_account_id: drawerAccountId,
  })

  if (error) return new Error(error.message)
  revalidateDrawerRoutes(kitchenId)
  return typeof data === 'string' ? data : String(data)
}

export async function addDrawerCashIn(
  kitchenId: string,
  input: AddCashInInput
): Promise<void | Error> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('add_cash_in', {
    p_kitchen_id: kitchenId,
    p_session_id: input.sessionId,
    p_amount: input.amount,
    p_source_account_id: input.sourceAccountId,
    p_reason: input.reason ?? null,
  })

  if (error) return new Error(error.message)
  revalidateDrawerRoutes(kitchenId)
}

export async function addDrawerCashOut(
  kitchenId: string,
  input: AddCashOutInput
): Promise<void | Error> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('add_cash_out', {
    p_kitchen_id: kitchenId,
    p_session_id: input.sessionId,
    p_amount: input.amount,
    p_destination_account_id: input.destinationAccountId,
    p_reason: input.reason ?? null,
  })

  if (error) return new Error(error.message)
  revalidateDrawerRoutes(kitchenId)
}

export async function closeDrawerSession(
  kitchenId: string,
  input: CloseDrawerInput
): Promise<void | Error> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('close_cash_drawer', {
    p_kitchen_id: kitchenId,
    p_session_id: input.sessionId,
    p_actual_close_amount: input.actualCloseAmount,
    p_close_date: input.closeDate,
    p_reason: input.reason ?? null,
  })

  if (error) return new Error(error.message)
  revalidateDrawerRoutes(kitchenId)
}

export async function reopenDrawerSession(
  kitchenId: string,
  sessionId: string,
  reason: string
): Promise<void | Error> {
  if (!reason.trim()) return new Error('A reason is required.')

  const supabase = await createClient()
  const { error } = await supabase.rpc('reopen_cash_drawer', {
    p_kitchen_id: kitchenId,
    p_session_id: sessionId,
    p_reason: reason,
  })

  if (error) return new Error(error.message)
  revalidateDrawerRoutes(kitchenId)
}

export async function undoDrawerTransaction(
  kitchenId: string,
  transactionId: string
): Promise<void | Error> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('undo_cash_transaction', {
    p_kitchen_id: kitchenId,
    p_transaction_id: transactionId,
  })

  if (error) return new Error(error.message)
  revalidateDrawerRoutes(kitchenId)
}
