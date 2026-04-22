export interface StaffMember {
  id: string
  kitchen_id: string
  full_name: string
  phone: string | null
  role: string | null
  pay_rate: string | number
  pay_frequency: 'daily' | 'weekly' | 'monthly'
  pay_calculation_type: 'fixed' | 'hourly'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkShift {
  id: string
  kitchen_id: string
  name: string
  shift_date: string
  start_time: string
  end_time: string
  created_by: string
  created_at: string
  created_member: {
    id: string
    profiles: { full_name: string } | null
  } | null
}

export interface ShiftAssignment {
  id: string
  kitchen_id: string
  shift_id: string
  staff_member_id: string
  checked_in_at: string | null
  checked_out_at: string | null
  created_at: string
  shift: WorkShift | null
  staff_member: StaffMember | null
}

export const STAFF_MEMBERS_QUERY_KEY = ['staff-members']
export const STAFF_MEMBERS_FROM = 'staff_members'
export const STAFF_MEMBERS_SELECT =
  'id, kitchen_id, full_name, phone, role, pay_rate, pay_frequency, pay_calculation_type, is_active, created_at, updated_at'

export const WORK_SHIFTS_QUERY_KEY = ['work-shifts']
export const WORK_SHIFTS_FROM = 'work_shifts'
export const WORK_SHIFTS_SELECT =
  'id, kitchen_id, name, shift_date, start_time, end_time, created_by, created_at, created_member:kitchen_members!created_by(id, profiles(full_name))'

export const SHIFT_ASSIGNMENTS_QUERY_KEY = ['shift-assignments']
export const SHIFT_ASSIGNMENTS_FROM = 'shift_assignments'
export const SHIFT_ASSIGNMENTS_SELECT =
  'id, kitchen_id, shift_id, staff_member_id, checked_in_at, checked_out_at, created_at, shift:work_shifts!shift_id(id, kitchen_id, name, shift_date, start_time, end_time, created_by, created_at), staff_member:staff_members!staff_member_id(id, kitchen_id, full_name, phone, role, pay_rate, pay_frequency, pay_calculation_type, is_active, created_at, updated_at)'
