'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface WorkShiftPayload {
  name: string
  shift_date: string
  start_time: string
  end_time: string
  created_by?: string
}

export async function createWorkShift(
  kitchenId: string,
  data: WorkShiftPayload
) {
  const supabase = await createClient()
  const { data: shift, error } = await supabase
    .from('work_shifts')
    .insert({
      kitchen_id: kitchenId,
      name: data.name,
      shift_date: data.shift_date,
      start_time: data.start_time,
      end_time: data.end_time,
      created_by: data.created_by,
    })
    .select('id')
    .single()

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
  return shift.id as string
}

export async function updateWorkShift(
  kitchenId: string,
  shiftId: string,
  data: WorkShiftPayload
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('work_shifts')
    .update({
      name: data.name,
      shift_date: data.shift_date,
      start_time: data.start_time,
      end_time: data.end_time,
    })
    .eq('id', shiftId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
}

export async function deleteWorkShift(kitchenId: string, shiftId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('work_shifts')
    .delete()
    .eq('id', shiftId)
    .eq('kitchen_id', kitchenId)

  if (error) return new Error(error.message)
  revalidatePath(`/${kitchenId}/staff`)
}
