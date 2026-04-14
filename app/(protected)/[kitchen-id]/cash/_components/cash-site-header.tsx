'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CashSiteHeaderProps {
  activeTab: string
  cashAccountsToolbar: ReactNode
  transactionsToolbar: ReactNode
  drawerToolbar: ReactNode
}

export function CashSiteHeader({
  activeTab,
  cashAccountsToolbar,
  transactionsToolbar,
  drawerToolbar,
}: CashSiteHeaderProps) {
  const toolbar =
    activeTab === 'cash-accounts'
      ? cashAccountsToolbar
      : activeTab === 'transactions'
        ? transactionsToolbar
        : drawerToolbar

  return (
    <SiteHeader title="Cash">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TabsList variant="line">
          <TabsTrigger value="cash-accounts">Cash Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="drawer">Drawer</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
          {toolbar}
        </div>
      </div>
    </SiteHeader>
  )
}
