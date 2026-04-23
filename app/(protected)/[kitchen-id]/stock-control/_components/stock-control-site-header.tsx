'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface StockControlSiteHeaderProps {
  activeTab: string
  stockCountsToolbar: ReactNode
  wasteToolbar: ReactNode
}

export function StockControlSiteHeader({
  activeTab,
  stockCountsToolbar,
  wasteToolbar,
}: StockControlSiteHeaderProps) {
  const toolbar = activeTab === 'stock-counts' ? stockCountsToolbar : wasteToolbar

  return (
    <SiteHeader title="Stock Control">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TabsList variant="line">
          <TabsTrigger value="stock-counts">Stock Counts</TabsTrigger>
          <TabsTrigger value="waste">Waste</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
          {toolbar}
        </div>
      </div>
    </SiteHeader>
  )
}
