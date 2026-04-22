import { createClient } from '@/lib/supabase/client'

export interface StaffMemberPick {
  id: string
  full_name: string
  role: string | null
  is_active: boolean
}

export interface WorkShiftPick {
  id: string
  name: string
  shift_date: string
  start_time: string
  end_time: string
}

export async function fetchStaffMembers(
  kitchenId: string
): Promise<StaffMemberPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_members')
    .select('id, full_name, role, is_active')
    .eq('kitchen_id', kitchenId)
    .order('full_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as StaffMemberPick[]
}

export async function fetchActiveStaffMembers(
  kitchenId: string
): Promise<StaffMemberPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('staff_members')
    .select('id, full_name, role, is_active')
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)
    .order('full_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as StaffMemberPick[]
}

export async function fetchWorkShifts(
  kitchenId: string
): Promise<WorkShiftPick[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('work_shifts')
    .select('id, name, shift_date, start_time, end_time')
    .eq('kitchen_id', kitchenId)
    .order('start_time', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as WorkShiftPick[]
}
