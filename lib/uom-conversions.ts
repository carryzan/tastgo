'use client'

import { createClient } from '@/lib/supabase/client'

export type InventoryUomContext =
  | 'purchase'
  | 'recipe'
  | 'modifier'
  | 'count'
  | 'waste'
  | 'return'
  | 'opening'

export type ProductionRecipeUomContext =
  | 'production'
  | 'recipe'
  | 'count'
  | 'waste'
  | 'opening'

export interface KitchenUom {
  id: string
  name: string
  abbreviation: string
}

export interface InventoryItemUomSource {
  id: string
  storage_uom_id: string | null
}

export interface ProductionRecipeUomSource {
  id: string
  storage_uom_id: string | null
}

export interface InventoryUomConversion {
  id: string
  inventory_item_id: string
  uom_id: string
  factor_to_storage: string | number
  allow_purchase: boolean
  allow_recipe: boolean
  allow_modifier: boolean
  allow_count: boolean
  allow_waste: boolean
  allow_return: boolean
  allow_opening: boolean
  is_default_purchase: boolean
  is_default_recipe: boolean
  is_default_modifier: boolean
  is_default_count: boolean
  is_default_waste: boolean
  is_default_return: boolean
  is_default_opening: boolean
}

export interface ProductionRecipeUomConversion {
  id: string
  production_recipe_id: string
  uom_id: string
  factor_to_storage: string | number
  allow_production: boolean
  allow_recipe: boolean
  allow_count: boolean
  allow_waste: boolean
  allow_opening: boolean
  is_default_production: boolean
  is_default_recipe: boolean
  is_default_count: boolean
  is_default_waste: boolean
  is_default_opening: boolean
}

export interface UomOption {
  uom_id: string
  label: string
  abbreviation: string
  factor_to_storage: number
  is_default: boolean
  is_storage: boolean
}

type InventoryAllowKey = `allow_${InventoryUomContext}`
type InventoryDefaultKey = `is_default_${InventoryUomContext}`
type ProductionAllowKey = `allow_${ProductionRecipeUomContext}`
type ProductionDefaultKey = `is_default_${ProductionRecipeUomContext}`

function uomById(uoms: KitchenUom[]) {
  return new Map(uoms.map((uom) => [uom.id, uom]))
}

function formatLabel(uom: KitchenUom, isStorage: boolean) {
  return isStorage ? `${uom.abbreviation} (storage)` : uom.abbreviation
}

export function buildInventoryUomOptions(
  item: InventoryItemUomSource | null | undefined,
  conversions: InventoryUomConversion[],
  uoms: KitchenUom[],
  context: InventoryUomContext
): UomOption[] {
  if (!item?.storage_uom_id) return []

  const byId = uomById(uoms)
  const options = new Map<string, UomOption>()
  const storageUom = byId.get(item.storage_uom_id)
  if (storageUom) {
    options.set(item.storage_uom_id, {
      uom_id: item.storage_uom_id,
      label: formatLabel(storageUom, true),
      abbreviation: storageUom.abbreviation,
      factor_to_storage: 1,
      is_default: false,
      is_storage: true,
    })
  }

  const allowKey = `allow_${context}` as InventoryAllowKey
  const defaultKey = `is_default_${context}` as InventoryDefaultKey

  for (const conversion of conversions) {
    if (conversion.inventory_item_id !== item.id || !conversion[allowKey]) continue
    const uom = byId.get(conversion.uom_id)
    if (!uom) continue
    options.set(conversion.uom_id, {
      uom_id: conversion.uom_id,
      label: formatLabel(uom, conversion.uom_id === item.storage_uom_id),
      abbreviation: uom.abbreviation,
      factor_to_storage: Number(conversion.factor_to_storage),
      is_default: Boolean(conversion[defaultKey]),
      is_storage: conversion.uom_id === item.storage_uom_id,
    })
  }

  return Array.from(options.values()).sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
    if (a.is_storage !== b.is_storage) return a.is_storage ? -1 : 1
    return a.abbreviation.localeCompare(b.abbreviation)
  })
}

export function buildProductionRecipeUomOptions(
  recipe: ProductionRecipeUomSource | null | undefined,
  conversions: ProductionRecipeUomConversion[],
  uoms: KitchenUom[],
  context: ProductionRecipeUomContext
): UomOption[] {
  if (!recipe?.storage_uom_id) return []

  const byId = uomById(uoms)
  const options = new Map<string, UomOption>()
  const storageUom = byId.get(recipe.storage_uom_id)
  if (storageUom) {
    options.set(recipe.storage_uom_id, {
      uom_id: recipe.storage_uom_id,
      label: formatLabel(storageUom, true),
      abbreviation: storageUom.abbreviation,
      factor_to_storage: 1,
      is_default: false,
      is_storage: true,
    })
  }

  const allowKey = `allow_${context}` as ProductionAllowKey
  const defaultKey = `is_default_${context}` as ProductionDefaultKey

  for (const conversion of conversions) {
    if (conversion.production_recipe_id !== recipe.id || !conversion[allowKey]) continue
    const uom = byId.get(conversion.uom_id)
    if (!uom) continue
    options.set(conversion.uom_id, {
      uom_id: conversion.uom_id,
      label: formatLabel(uom, conversion.uom_id === recipe.storage_uom_id),
      abbreviation: uom.abbreviation,
      factor_to_storage: Number(conversion.factor_to_storage),
      is_default: Boolean(conversion[defaultKey]),
      is_storage: conversion.uom_id === recipe.storage_uom_id,
    })
  }

  return Array.from(options.values()).sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
    if (a.is_storage !== b.is_storage) return a.is_storage ? -1 : 1
    return a.abbreviation.localeCompare(b.abbreviation)
  })
}

export function defaultUomId(options: UomOption[]) {
  return options.find((option) => option.is_default)?.uom_id ?? options[0]?.uom_id ?? ''
}

export async function fetchInventoryUomConversions(
  kitchenId: string
): Promise<InventoryUomConversion[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('inventory_item_uom_conversions')
    .select(
      'id, inventory_item_id, uom_id, factor_to_storage, allow_purchase, allow_recipe, allow_modifier, allow_count, allow_waste, allow_return, allow_opening, is_default_purchase, is_default_recipe, is_default_modifier, is_default_count, is_default_waste, is_default_return, is_default_opening'
    )
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)

  if (error) throw new Error(error.message)
  return (data ?? []) as InventoryUomConversion[]
}

export async function fetchProductionRecipeUomConversions(
  kitchenId: string
): Promise<ProductionRecipeUomConversion[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('production_recipe_uom_conversions')
    .select(
      'id, production_recipe_id, uom_id, factor_to_storage, allow_production, allow_recipe, allow_count, allow_waste, allow_opening, is_default_production, is_default_recipe, is_default_count, is_default_waste, is_default_opening'
    )
    .eq('kitchen_id', kitchenId)
    .eq('is_active', true)

  if (error) throw new Error(error.message)
  return (data ?? []) as ProductionRecipeUomConversion[]
}
