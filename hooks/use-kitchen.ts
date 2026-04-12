import { useContext } from 'react'
import {
  KitchenContext,
  type KitchenContextValue,
} from '@/lib/kitchen-context'

export function useKitchen(): KitchenContextValue {
  const ctx = useContext(KitchenContext)
  if (!ctx) throw new Error('useKitchen must be used inside KitchenProvider')
  return ctx
}
