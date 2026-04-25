export const ONLINE_SETTLEMENTS_QUERY_KEY = ['online-settlements']
export const ONLINE_SETTLEMENTS_FROM = 'online_settlements'
export const ONLINE_SETTLEMENTS_SELECT =
  '*, source:sources!source_id(id, name, type, settlement_mode), settlement_account:chart_of_accounts!settlement_account_id(id, code, name), created_member:kitchen_members!created_by(id, profiles(full_name)), completed_member:kitchen_members!completed_by(id, profiles(full_name)), reversed_member:kitchen_members!reversed_by(id, profiles(full_name))'

export const OFFLINE_SETTLEMENTS_QUERY_KEY = ['offline-settlements']
export const OFFLINE_SETTLEMENTS_FROM = 'offline_settlements'
export const OFFLINE_SETTLEMENTS_SELECT =
  '*, order:orders!order_id(id, order_number, source_order_code), settlement_account:chart_of_accounts!settlement_account_id(id, code, name), journal_entry:journal_entries!journal_entry_id(id, journal_number), reversal_journal_entry:journal_entries!reversal_journal_entry_id(id, journal_number), created_member:kitchen_members!created_by(id, profiles(full_name)), reversed_member:kitchen_members!reversed_by(id, profiles(full_name))'
