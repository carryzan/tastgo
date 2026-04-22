'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface CreateExpenseRecordData {
  category_id: string
  name: string
  amount: number
  billing_period_type: 'one_time' | 'recurring'
  expense_date: string
  settlement_account_id: string
  staff_member_id?: string | null
  recurrence_schedule_id?: string | null
}

export async function createExpenseRecord(
  kitchenId: string,
  data: CreateExpenseRecordData
) {
  const supabase = await createClient()
  const { data: expenseId, error } = await supabase.rpc('create_expense_record', {
    p_kitchen_id: kitchenId,
    p_category_id: data.category_id,
    p_name: data.name,
    p_amount: data.amount,
    p_billing_period_type: data.billing_period_type,
    p_expense_date: data.expense_date,
    p_settlement_account_id: data.settlement_account_id,
    p_staff_member_id: data.staff_member_id ?? null,
    p_recurrence_schedule_id: data.recurrence_schedule_id ?? null,
  })

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/expenses`)
  return expenseId as string
}

export async function reverseExpenseRecord(
  kitchenId: string,
  expenseId: string,
  reason: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('reverse_expense_record', {
    p_kitchen_id: kitchenId,
    p_expense_id: expenseId,
    p_reason: reason,
  })

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/expenses`)
  return data as string
}
