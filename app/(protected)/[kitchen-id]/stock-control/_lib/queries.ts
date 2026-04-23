export const STOCK_COUNT_SESSIONS_QUERY_KEY = ['stock-count-sessions']
export const STOCK_COUNT_SESSIONS_FROM = 'stock_count_sessions'
export const STOCK_COUNT_SESSIONS_SELECT =
  '*, created_member:kitchen_members!created_by(id, profiles(full_name)), completed_member:kitchen_members!completed_by(id, profiles(full_name))'

export const WASTE_LEDGER_QUERY_KEY = ['waste-ledger-entries']
export const WASTE_LEDGER_FROM = 'waste_ledger_entries'
export const WASTE_LEDGER_SELECT =
  '*, inventory_items!inventory_item_id(id, name), production_recipes!production_recipe_id(id, name), created_member:kitchen_members!created_by(id, profiles(full_name)), reversed_member:kitchen_members!reversed_by(id, profiles(full_name))'
