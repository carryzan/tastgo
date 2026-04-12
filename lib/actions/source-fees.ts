'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createSourceFee(data: {
  kitchen_id: string
  source_id: string
  commission_rate: number
  commission_basis: 'before_discount' | 'after_discount'
  fixed_fee: number
  effective_from: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('source_fees').insert(data)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function updateSourceFee(
  id: string,
  updates: {
    commission_rate?: number
    commission_basis?: 'before_discount' | 'after_discount'
    fixed_fee?: number
    effective_from?: string
  }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('source_fees').update(updates).eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}

export async function deleteSourceFee(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('source_fees').delete().eq('id', id)
  if (error) return new Error(error.message)
  revalidatePath('/[kitchen-id]', 'layout')
}