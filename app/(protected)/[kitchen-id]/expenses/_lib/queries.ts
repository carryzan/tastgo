export interface ExpenseAccount {
  id: string
  code: string
  name: string
  is_active?: boolean
}

export interface ExpenseCategory {
  id: string
  kitchen_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  expense_account_id: string | null
  expense_account: ExpenseAccount | null
}

export interface ExpenseRecurrenceSchedule {
  id: string
  kitchen_id: string
  category_id: string
  name: string
  amount: string | number
  settlement_account_id: string
  frequency: 'weekly' | 'monthly'
  next_due_date: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  category: ExpenseCategory | null
  settlement_account: ExpenseAccount | null
  created_member: {
    id: string
    profiles: { full_name: string } | null
  } | null
}

export interface ExpenseRecord {
  id: string
  kitchen_id: string
  category_id: string
  name: string
  amount: string | number
  billing_period_type: 'one_time' | 'recurring'
  expense_date: string
  staff_member_id: string | null
  recurrence_schedule_id: string | null
  created_by: string
  created_at: string
  reversal_of_id: string | null
  reversed_by: string | null
  reversed_at: string | null
  reversal_reason: string | null
  settlement_account_id: string | null
  journal_entry_id: string | null
  category: ExpenseCategory | null
  settlement_account: ExpenseAccount | null
  staff_member: {
    id: string
    full_name: string
    role: string | null
    is_active: boolean
  } | null
  created_member: {
    id: string
    profiles: { full_name: string } | null
  } | null
  reversed_member: {
    id: string
    profiles: { full_name: string } | null
  } | null
  schedule: {
    id: string
    name: string
    frequency: 'weekly' | 'monthly'
    next_due_date: string
  } | null
  journal_entry: {
    id: string
    journal_number: number
    entry_type: string
    status: string
  } | null
}

export const EXPENSE_RECORDS_QUERY_KEY = ['expense-records']
export const EXPENSE_RECORDS_FROM = 'expense_records'
export const EXPENSE_RECORDS_SELECT =
  'id, kitchen_id, category_id, name, amount, billing_period_type, expense_date, staff_member_id, recurrence_schedule_id, created_by, created_at, reversal_of_id, reversed_by, reversed_at, reversal_reason, settlement_account_id, journal_entry_id, category:expense_categories!category_id(id, kitchen_id, name, is_active, created_at, updated_at, expense_account_id), settlement_account:chart_of_accounts!settlement_account_id(id, code, name, is_active), staff_member:staff_members!staff_member_id(id, full_name, role, is_active), created_member:kitchen_members!created_by(id, profiles(full_name)), reversed_member:kitchen_members!reversed_by(id, profiles(full_name)), schedule:expense_recurrence_schedules!recurrence_schedule_id(id, name, frequency, next_due_date), journal_entry:journal_entries!journal_entry_id(id, journal_number, entry_type, status)'

export const EXPENSE_CATEGORIES_QUERY_KEY = ['expense-categories']
export const EXPENSE_CATEGORIES_FROM = 'expense_categories'
export const EXPENSE_CATEGORIES_SELECT =
  'id, kitchen_id, name, is_active, created_at, updated_at, expense_account_id, expense_account:chart_of_accounts!expense_account_id(id, code, name, is_active)'

export const EXPENSE_RECURRING_QUERY_KEY = ['expense-recurring-schedules']
export const EXPENSE_RECURRING_FROM = 'expense_recurrence_schedules'
export const EXPENSE_RECURRING_SELECT =
  'id, kitchen_id, category_id, name, amount, settlement_account_id, frequency, next_due_date, is_active, created_by, created_at, updated_at, category:expense_categories!category_id(id, kitchen_id, name, is_active, created_at, updated_at, expense_account_id), settlement_account:chart_of_accounts!settlement_account_id(id, code, name, is_active), created_member:kitchen_members!created_by(id, profiles(full_name))'
