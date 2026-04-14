export const SUPPLIERS_QUERY_KEY = ['suppliers']
export const SUPPLIERS_FROM = 'suppliers'
export const SUPPLIERS_SELECT = '*'

export const PURCHASES_QUERY_KEY = ['purchases']
export const PURCHASES_FROM = 'purchases'
export const PURCHASES_SELECT =
  '*, suppliers!supplier_id(id, name), created_member:kitchen_members!created_by(id, profiles(full_name)), received_member:kitchen_members!received_by(id, profiles(full_name))'

export const PAYMENTS_QUERY_KEY = ['supplier-payments']
export const PAYMENTS_FROM = 'supplier_payments'
export const PAYMENTS_SELECT =
  '*, suppliers!supplier_id(id, name), purchases!purchase_id(id, purchase_number), cash_accounts!cash_account_id(id, name), paid_member:kitchen_members!paid_by(id, profiles(full_name))'

export const RETURNS_QUERY_KEY = ['supplier-returns']
export const RETURNS_FROM = 'supplier_returns'
export const RETURNS_SELECT =
  '*, suppliers!supplier_id(id, name), purchases!purchase_id(id, purchase_number), created_member:kitchen_members!created_by(id, profiles(full_name))'

export const CREDIT_NOTES_QUERY_KEY = ['supplier-credit-notes']
export const CREDIT_NOTES_FROM = 'supplier_credit_notes'
export const CREDIT_NOTES_SELECT =
  '*, suppliers!supplier_id(id, name), supplier_returns!supplier_return_id(id), applied_purchase:purchases!applied_to_purchase_id(id, purchase_number)'
