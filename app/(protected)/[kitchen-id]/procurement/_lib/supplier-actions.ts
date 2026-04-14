'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateSupplierData {
  name: string
  contact_name?: string
  phone?: string
  email?: string
}

interface UpdateSupplierData {
  name?: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  is_active?: boolean
}

interface CreateOpeningBalanceData {
  kitchen_id: string
  supplier_id: string
  outstanding_balance: number
  as_of_date: string
  created_by: string
}

export async function createSupplier(kitchenId: string, data: CreateSupplierData) {
  const supabase = await createClient()
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({
      kitchen_id: kitchenId,
      name: data.name,
      contact_name: data.contact_name ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
    })
    .select('id')
    .single()
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
  return supplier.id as string
}

export async function updateSupplier(
  kitchenId: string,
  supplierId: string,
  data: UpdateSupplierData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('suppliers')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', supplierId)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function deleteSupplier(kitchenId: string, supplierId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId)
    .eq('kitchen_id', kitchenId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}

export async function createSupplierOpeningBalance(data: CreateOpeningBalanceData) {
  const supabase = await createClient()
  const { error } = await supabase.from('supplier_opening_balances').insert({
    kitchen_id: data.kitchen_id,
    supplier_id: data.supplier_id,
    outstanding_balance: data.outstanding_balance,
    as_of_date: data.as_of_date,
    created_by: data.created_by,
  })
  if (error) return new Error(error.message)
  revalidatePath(`/${data.kitchen_id}/procurement`)
}

export async function deleteSupplierOpeningBalance(
  kitchenId: string,
  balanceId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('supplier_opening_balances')
    .delete()
    .eq('id', balanceId)
  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/procurement`)
}
