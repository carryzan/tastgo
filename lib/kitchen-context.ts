import { createContext } from 'react'

export interface KitchenContextValue {
  kitchen: { id: string; name: string; location: string | null } & Record<string, unknown>
  kitchenSettings: Record<string, unknown> | null
  membership: Record<string, unknown> & {
    is_active: boolean
  }
  permissions: Set<string>
  kitchens: unknown[]
  members: unknown[]
  brands: unknown[]
  sources: unknown[]
  unitsOfMeasure: unknown[]
  updateSettings: (updates: Record<string, unknown>) => Promise<void>
}

export const KitchenContext = createContext<KitchenContextValue | null>(null)