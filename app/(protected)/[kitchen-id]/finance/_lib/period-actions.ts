'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function closeAccountingPeriod(
  kitchenId: string,
  periodId: string
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('close_accounting_period', {
    p_period_id: periodId,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}

export async function reopenAccountingPeriod(
  kitchenId: string,
  periodId: string,
  reason: string
) {
  if (reason.trim().length < 5) {
    return new Error('Reason must be at least 5 characters.')
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc('reopen_accounting_period', {
    p_period_id: periodId,
    p_reason: reason.trim(),
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/cash`)
}
