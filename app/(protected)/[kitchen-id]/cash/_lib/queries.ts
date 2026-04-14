export const CASH_ACCOUNTS_QUERY_KEY = ['cash-accounts']
export const CASH_ACCOUNTS_FROM = 'cash_accounts'
export const CASH_ACCOUNTS_SELECT = '*'

export const CASH_TRANSACTIONS_QUERY_KEY = ['cash-transactions']
export const CASH_TRANSACTIONS_FROM = 'cash_account_transactions'
export const CASH_TRANSACTIONS_SELECT =
  '*, cash_accounts!cash_account_id(id, name), created_member:kitchen_members!created_by(id, profiles(full_name)), transfer_account:cash_accounts!transfer_to_account_id(id, name)'

export const DRAWER_SESSIONS_QUERY_KEY = ['drawer-sessions']
export const DRAWER_SESSIONS_FROM = 'cash_drawer_sessions'
export const DRAWER_SESSIONS_SELECT =
  '*, opened_member:kitchen_members!opened_by(id, profiles(full_name)), closed_member:kitchen_members!closed_by(id, profiles(full_name))'
