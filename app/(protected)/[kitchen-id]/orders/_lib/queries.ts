export const ORDERS_QUERY_KEY = ['orders']
export const ORDERS_FROM = 'orders'
export const ORDERS_SELECT =
  '*, brands!brand_id(id, name), sources!source_id(id, name, type, settlement_mode), created_member:kitchen_members!created_by(id, profiles(full_name))'
