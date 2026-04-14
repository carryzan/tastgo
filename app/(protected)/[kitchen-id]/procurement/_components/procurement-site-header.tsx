'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ProcurementSiteHeaderProps {
  activeTab: string
  suppliersToolbar: ReactNode
  purchasesToolbar: ReactNode
  paymentsToolbar: ReactNode
  returnsToolbar: ReactNode
  creditNotesToolbar: ReactNode
}

export function ProcurementSiteHeader({
  activeTab,
  suppliersToolbar,
  purchasesToolbar,
  paymentsToolbar,
  returnsToolbar,
  creditNotesToolbar,
}: ProcurementSiteHeaderProps) {
  const toolbar =
    activeTab === 'suppliers'
      ? suppliersToolbar
      : activeTab === 'purchases'
        ? purchasesToolbar
        : activeTab === 'payments'
          ? paymentsToolbar
          : activeTab === 'returns'
            ? returnsToolbar
            : creditNotesToolbar

  return (
    <SiteHeader title="Procurement">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TabsList variant="line">
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
          {toolbar}
        </div>
      </div>
    </SiteHeader>
  )
}
