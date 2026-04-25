'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SettlementSiteHeaderProps {
  activeTab: string
  onlineToolbar: ReactNode
  offlineToolbar: ReactNode
}

export function SettlementSiteHeader({
  activeTab,
  onlineToolbar,
  offlineToolbar,
}: SettlementSiteHeaderProps) {
  const toolbar = activeTab === 'online' ? onlineToolbar : offlineToolbar

  return (
    <SiteHeader title="Settlement">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TabsList variant="line">
          <TabsTrigger value="online">Platform Settlements</TabsTrigger>
          <TabsTrigger value="offline">Cash Settlements</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
          {toolbar}
        </div>
      </div>
    </SiteHeader>
  )
}
