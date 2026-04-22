'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ShiftAssignmentPayload {
  shift_id: string
  staff_member_id: string
  checked_in_at?: string | null
  checked_out_at?: string | null
}

export async function createShiftAssignment(
  kitchenId: string,
  data: ShiftAssignmentPayload
) {
  const supabase = await createClient()
  const { data: assignment, error } = await supabase
    .from('shift_assignments')
    .insert({
      kitchen_id: kitchenId,
      shift_id: data.shift_id,
      staff_member_id: data.staff_member_id,
      checked_in_at: data.checked_in_at ?? null,
      checked_out_at: data.checked_out_at ?? null,
    })
    .select('id')
    .single()

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
  return assignment.id as string
}

export async function updateShiftAssignment(
  kitchenId: string,
  assignmentId: string,
  data: ShiftAssignmentPayload
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('shift_assignments')
    .update({
      shift_id: data.shift_id,
      staff_member_id: data.staff_member_id,
      checked_in_at: data.checked_in_at ?? null,
      checked_out_at: data.checked_out_at ?? null,
    })
    .eq('id', assignmentId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
}

export async function deleteShiftAssignment(
  kitchenId: string,
  assignmentId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('shift_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
}
