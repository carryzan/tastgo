import { useKitchen } from '@/hooks/use-kitchen'

export function usePermission(permission: string): boolean {
  const { permissions } = useKitchen()
  return permissions.has(permission)
}
