export const MENU_ITEMS_QUERY_KEY = ['menu-items']
export const MENU_ITEMS_FROM = 'menu_items'
// menu_items.current_recipe_version_id → menu_item_recipe_versions (ambiguous path)
// menu_item_recipe_versions also has menu_item_id FK back; hint !menu_item_id for the reverse embed
export const MENU_ITEMS_SELECT =
  '*, brands!brand_id(id, name), menus!menu_id(id, name), menu_item_recipe_versions!menu_item_id(id, version_number)'

export const MODIFIER_GROUPS_QUERY_KEY = ['modifier-groups']
export const MODIFIER_GROUPS_FROM = 'modifier_groups'
export const MODIFIER_GROUPS_SELECT =
  '*, brands!brand_id(id, name), modifier_options(id)'

export const COMBOS_QUERY_KEY = ['combos']
export const COMBOS_FROM = 'combos'
export const COMBOS_SELECT =
  '*, brands!brand_id(id, name), combo_items(id, sort_order, menu_item_id, menu_items!menu_item_id(id, name))'
