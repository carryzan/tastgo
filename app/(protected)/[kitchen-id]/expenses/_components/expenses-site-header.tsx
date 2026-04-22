'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ExpensesSiteHeaderProps {
  activeTab: string
  recordsToolbar: ReactNode
  categoriesToolbar: ReactNode
  recurringToolbar: ReactNode
}

export function ExpensesSiteHeader({
  activeTab,
  recordsToolbar,
  categoriesToolbar,
  recurringToolbar,
}: ExpensesSiteHeaderProps) {
  const toolbar =
    activeTab === 'records'
      ? recordsToolbar
      : activeTab === 'categories'
        ? categoriesToolbar
        : recurringToolbar

  return (
    <SiteHeader title="Expenses">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TabsList variant="line">
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
          {toolbar}
        </div>
      </div>
    </SiteHeader>
  )
}
