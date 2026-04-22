'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ExpenseRecurrencePayload {
  category_id: string
  name: string
  amount: number
  settlement_account_id: string
  frequency: 'weekly' | 'monthly'
  next_due_date: string
  is_active?: boolean
  created_by?: string
}

export async function createExpenseRecurrenceSchedule(
  kitchenId: string,
  data: ExpenseRecurrencePayload
) {
  const supabase = await createClient()
  const { data: schedule, error } = await supabase
    .from('expense_recurrence_schedules')
    .insert({
      kitchen_id: kitchenId,
      category_id: data.category_id,
      name: data.name,
      amount: data.amount,
      settlement_account_id: data.settlement_account_id,
      frequency: data.frequency,
      next_due_date: data.next_due_date,
      is_active: data.is_active ?? true,
      created_by: data.created_by,
    })
    .select('id')
    .single()

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/expenses`)
  return schedule.id as string
}

export async function updateExpenseRecurrenceSchedule(
  kitchenId: string,
  scheduleId: string,
  data: ExpenseRecurrencePayload
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expense_recurrence_schedules')
    .update({
      category_id: data.category_id,
      name: data.name,
      amount: data.amount,
      settlement_account_id: data.settlement_account_id,
      frequency: data.frequency,
      next_due_date: data.next_due_date,
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/expenses`)
}

export async function deleteExpenseRecurrenceSchedule(
  kitchenId: string,
  scheduleId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expense_recurrence_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/expenses`)
}
