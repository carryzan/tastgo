import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { QueryProvider } from '@/components/query-provider'
import { KitchenProvider } from '@/components/kitchen-provider'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  getKitchen,
  getKitchenSettings,
  getKitchenMembers,
  getKitchenBrands,
  getKitchenSources,
  getKitchenUOM,
} from '@/lib/supabase/queries/kitchen'
import {
  getMembership,
  getMemberPermissions,
  getMemberKitchens,
} from '@/lib/supabase/queries/membership'

export default async function KitchenLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params

  const [
    { data: kitchen },
    { data: kitchenSettings },
    { data: membership },
    { data: permissions },
    { data: kitchens },
    { data: members },
    { data: brands },
    { data: sources },
    { data: unitsOfMeasure },
  ] = await Promise.all([
    getKitchen(kitchenId),
    getKitchenSettings(kitchenId),
    getMembership(kitchenId),
    getMemberPermissions(kitchenId),
    getMemberKitchens(),
    getKitchenMembers(kitchenId),
    getKitchenBrands(kitchenId),
    getKitchenSources(kitchenId),
    getKitchenUOM(kitchenId),
  ])

  if (!kitchen || !membership || !membership.is_active) {
    notFound()
  }

  return (
    <QueryProvider>
      <KitchenProvider
        kitchen={kitchen}
        kitchenSettings={kitchenSettings}
        membership={membership}
        permissions={permissions ?? []}
        kitchens={kitchens?.map((k) => k.kitchens).filter(Boolean) ?? []}
        members={members ?? []}
        brands={brands ?? []}
        sources={sources ?? []}
        unitsOfMeasure={unitsOfMeasure ?? []}
      >
        <SidebarProvider className="h-svh">
          <AppSidebar />
          <SidebarInset className="contain-inline-size min-h-0">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </KitchenProvider>
    </QueryProvider>
  )
}