'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface StaffMemberPayload {
  full_name: string
  phone?: string | null
  role?: string | null
  pay_rate: number
  pay_frequency: 'daily' | 'weekly' | 'monthly'
  pay_calculation_type: 'fixed' | 'hourly'
  is_active?: boolean
}

export async function createStaffMember(
  kitchenId: string,
  data: StaffMemberPayload
) {
  const supabase = await createClient()
  const { data: staffMember, error } = await supabase
    .from('staff_members')
    .insert({
      kitchen_id: kitchenId,
      full_name: data.full_name,
      phone: data.phone ?? null,
      role: data.role ?? null,
      pay_rate: data.pay_rate,
      pay_frequency: data.pay_frequency,
      pay_calculation_type: data.pay_calculation_type,
      is_active: data.is_active ?? true,
    })
    .select('id')
    .single()

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
  return staffMember.id as string
}

export async function updateStaffMember(
  kitchenId: string,
  staffMemberId: string,
  data: StaffMemberPayload
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('staff_members')
    .update({
      full_name: data.full_name,
      phone: data.phone ?? null,
      role: data.role ?? null,
      pay_rate: data.pay_rate,
      pay_frequency: data.pay_frequency,
      pay_calculation_type: data.pay_calculation_type,
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffMemberId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
}

export async function deleteStaffMember(
  kitchenId: string,
  staffMemberId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('staff_members')
    .delete()
    .eq('id', staffMemberId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
}
