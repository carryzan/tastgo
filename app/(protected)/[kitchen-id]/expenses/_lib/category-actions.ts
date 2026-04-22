'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ExpenseCategoryPayload {
  name: string
  expense_account_id: string
  is_active?: boolean
}

export async function createExpenseCategory(
  kitchenId: string,
  data: ExpenseCategoryPayload
) {
  const supabase = await createClient()
  const { data: category, error } = await supabase
    .from('expense_categories')
    .insert({
      kitchen_id: kitchenId,
      name: data.name,
      expense_account_id: data.expense_account_id,
      is_active: data.is_active ?? true,
    })
    .select('id')
    .single()

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/expenses`)
  return category.id as string
}

export async function updateExpenseCategory(
  kitchenId: string,
  categoryId: string,
  data: ExpenseCategoryPayload
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expense_categories')
    .update({
      name: data.name,
      expense_account_id: data.expense_account_id,
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/expenses`)
}

export async function deleteExpenseCategory(
  kitchenId: string,
  categoryId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', categoryId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/expenses`)
}
