// Chart of Accounts
export const CHART_ACCOUNTS_QUERY_KEY = ['chart-accounts']
export const CHART_ACCOUNTS_FROM = 'chart_of_accounts'
export const CHART_ACCOUNTS_SELECT =
  'id, kitchen_id, code, name, account_type, parent_account_id, normal_balance, is_system, is_active, created_at, updated_at'

// Drawer Sessions
export const DRAWER_SESSIONS_QUERY_KEY = ['drawer-sessions']
export const DRAWER_SESSIONS_FROM = 'cash_drawer_sessions'
export const DRAWER_SESSIONS_SELECT =
  '*, opened_member:kitchen_members!opened_by(id, profiles(full_name)), closed_member:kitchen_members!closed_by(id, profiles(full_name)), reopened_member:kitchen_members!reopened_by(id, profiles(full_name)), drawer_account:chart_of_accounts!drawer_account_id(id, code, name)'

// Journal Entries
export const JOURNAL_ENTRIES_QUERY_KEY = ['journal-entries']
export const JOURNAL_ENTRIES_FROM = 'journal_entries'
export const JOURNAL_ENTRIES_SELECT =
  '*, period:accounting_periods(id, name, status), posted_member:kitchen_members!posted_by(id, profiles(full_name))'

// Accounting Periods
export const ACCOUNTING_PERIODS_QUERY_KEY = ['accounting-periods']
export const ACCOUNTING_PERIODS_FROM = 'accounting_periods'
export const ACCOUNTING_PERIODS_SELECT =
  'id, kitchen_id, name, start_date, end_date, status, closed_at, closed_by, reopened_at, reopened_by, reopen_reason, created_at'
