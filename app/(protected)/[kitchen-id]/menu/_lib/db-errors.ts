/**
 * Maps Postgres unique-violation constraint names and trigger RAISE EXCEPTION
 * messages to user-friendly strings for the menu domain.
 *
 * Supabase wraps the Postgres message directly into Error.message, so we
 * match on substrings that are stable across Postgres versions.
 */
export function mapMenuDbError(err: Error): string {
  const msg = err.message

  // ── Unique violations (error code 23505) ─────────────────────────────────
  if (msg.includes('menus_brand_id_name_key'))
    return 'A menu with this name already exists for this brand.'
  if (msg.includes('menu_items_menu_id_name_key'))
    return 'A menu item with this name already exists in this menu.'
  if (msg.includes('modifier_groups_brand_id_name_key'))
    return 'A modifier group with this name already exists for this brand.'
  if (msg.includes('combos_brand_id_name_key'))
    return 'A combo with this name already exists for this brand.'
  if (msg.includes('combo_items_combo_id_menu_item_id_key'))
    return 'This menu item is already in the combo.'
  if (
    msg.includes(
      'menu_item_modifier_groups_menu_item_id_modifier_group_id_key'
    )
  )
    return 'This modifier group is already attached to this menu item.'
  if (msg.includes('brands_kitchen_id_name_key'))
    return 'A brand with this name already exists.'
  if (msg.includes('menu_item_recipe_versions_menu_item_id_version_number_key'))
    return 'This version number already exists for this menu item.'

  // ── Trigger / RPC guard messages (P0001) ──────────────────────────────────

  // guard_menu_item_requires_recipe_version
  if (
    msg.toLowerCase().includes('recipe version') &&
    (msg.toLowerCase().includes('activ') ||
      msg.toLowerCase().includes('current_recipe_version'))
  )
    return 'Cannot activate a menu item without a recipe version. Create a recipe version first.'

  // guard_menu_recipe_version_has_components / assert_nonempty_jsonb_array
  if (
    (msg.toLowerCase().includes('recipe version') ||
      msg.toLowerCase().includes('components')) &&
    (msg.toLowerCase().includes('no component') ||
      msg.toLowerCase().includes('empty') ||
      msg.toLowerCase().includes('at least one'))
  )
    return 'Add at least one component before saving the recipe version.'

  // guard_recipe_version_immutable
  if (
    msg.toLowerCase().includes('immutable') ||
    msg.toLowerCase().includes('already used by') ||
    (msg.toLowerCase().includes('recipe version') &&
      msg.toLowerCase().includes('cannot be modified'))
  )
    return 'This recipe version is already used by an order or batch and cannot be modified. Create a new version instead.'

  // validate_menu_item_recipe_component_context — no current version on production recipe
  if (
    msg.toLowerCase().includes('production recipe') &&
    (msg.toLowerCase().includes('no current version') ||
      msg.toLowerCase().includes('current_version_id'))
  )
    return 'The selected production recipe has no published version. Publish a version first.'

  // guard_combo_has_items (deferrable — fires on commit)
  if (
    msg.toLowerCase().includes('combo') &&
    (msg.toLowerCase().includes('no item') ||
      msg.toLowerCase().includes('at least one item'))
  )
    return 'Cannot activate a combo with no items. Add at least one item first.'

  // guard_combo_last_item
  if (
    msg.toLowerCase().includes('last') &&
    msg.toLowerCase().includes('item') &&
    msg.toLowerCase().includes('combo')
  )
    return 'Cannot remove the last item from an active combo.'

  // validate_combo_price / revalidate_combo_price_on_item_change
  if (
    msg.toLowerCase().includes('discounted') ||
    (msg.toLowerCase().includes('combo') &&
      msg.toLowerCase().includes('price') &&
      (msg.toLowerCase().includes('sum') ||
        msg.toLowerCase().includes('less than') ||
        msg.toLowerCase().includes('total')))
  )
    return 'The discounted combo price must be less than the total sum of its item prices.'

  // guard_modifier_group_has_options (deferrable)
  if (
    msg.toLowerCase().includes('modifier group') &&
    (msg.toLowerCase().includes('no active option') ||
      msg.toLowerCase().includes('at least one') ||
      msg.toLowerCase().includes('option'))
  )
    return 'Cannot activate a modifier group with no active options. Add at least one active option first.'

  // guard_modifier_group_last_option
  if (
    msg.toLowerCase().includes('last') &&
    msg.toLowerCase().includes('option')
  )
    return 'Cannot deactivate the last active option of an active modifier group.'

  return msg
}
