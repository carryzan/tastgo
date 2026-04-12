'use client'

import { useState, useRef, useMemo, type ReactNode } from 'react'
import { KitchenContext, type KitchenContextValue } from '@/lib/kitchen-context'
import { updateKitchenSettings } from '@/lib/actions/kitchen'

interface KitchenProviderProps {
  kitchen: KitchenContextValue['kitchen']
  kitchenSettings: KitchenContextValue['kitchenSettings']
  membership: KitchenContextValue['membership']
  permissions: string[]
  kitchens: unknown[]
  members: unknown[]
  brands: unknown[]
  sources: unknown[]
  unitsOfMeasure: unknown[]
  children: ReactNode
}

export function KitchenProvider({
  kitchen,
  kitchenSettings: initialSettings,
  membership,
  permissions,
  kitchens,
  members,
  brands,
  sources,
  unitsOfMeasure,
  children,
}: KitchenProviderProps) {
  const [settings, setSettings] = useState(initialSettings)
  const previousSettingsRef = useRef(initialSettings)
  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  async function updateSettings(updates: Record<string, unknown>) {
    previousSettingsRef.current = settings
    setSettings((prev) => ({ ...prev, ...updates }))
    const error = await updateKitchenSettings(kitchen.id, updates)
    if (error) {
      setSettings(previousSettingsRef.current)
    }
  }

  return (
    <KitchenContext.Provider
      value={{
        kitchen,
        kitchenSettings: settings,
        membership,
        permissions: permissionSet,
        kitchens,
        members,
        brands,
        sources,
        unitsOfMeasure,
        updateSettings,
      }}
    >
      {children}
    </KitchenContext.Provider>
  )
}