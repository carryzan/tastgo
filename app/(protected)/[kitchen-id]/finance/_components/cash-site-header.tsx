'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CashSiteHeaderProps {
  activeTab: string
  cashAccountsToolbar: ReactNode
  drawerToolbar: ReactNode
  journalsToolbar: ReactNode
  periodsToolbar: ReactNode
}

export function CashSiteHeader({
  activeTab,
  cashAccountsToolbar,
  drawerToolbar,
  journalsToolbar,
  periodsToolbar,
}: CashSiteHeaderProps) {
  const toolbar =
    activeTab === 'cash-accounts'
      ? cashAccountsToolbar
      : activeTab === 'drawer'
        ? drawerToolbar
        : activeTab === 'journals'
          ? journalsToolbar
          : periodsToolbar

  return (
    <SiteHeader title="Finance">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TabsList variant="line">
          <TabsTrigger value="cash-accounts">Accounts</TabsTrigger>
          <TabsTrigger value="drawer">Drawer</TabsTrigger>
          <TabsTrigger value="journals">Journals</TabsTrigger>
          <TabsTrigger value="periods">Periods</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
          {toolbar}
        </div>
      </div>
    </SiteHeader>
  )
}
