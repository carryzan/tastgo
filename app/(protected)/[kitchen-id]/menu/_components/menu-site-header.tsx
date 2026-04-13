'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MenuSiteHeaderProps {
  activeTab: string
  menuItemsToolbar: ReactNode
  modifierGroupsToolbar: ReactNode
  combosToolbar: ReactNode
  /** Rendered after the tab toolbar (e.g. site overflow menu). */
  trailingSlot: ReactNode
}

export function MenuSiteHeader({
  activeTab,
  menuItemsToolbar,
  modifierGroupsToolbar,
  combosToolbar,
  trailingSlot,
}: MenuSiteHeaderProps) {
  const toolbar =
    activeTab === 'menu-items'
      ? menuItemsToolbar
      : activeTab === 'modifier-groups'
        ? modifierGroupsToolbar
        : combosToolbar

  return (
    <SiteHeader title="Menu">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TabsList variant="line">
          <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
          <TabsTrigger value="modifier-groups">Modifier Groups</TabsTrigger>
          <TabsTrigger value="combos">Combos</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
          {toolbar}
          {trailingSlot}
        </div>
      </div>
    </SiteHeader>
  )
}
