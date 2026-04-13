'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { MoreHorizontalIcon, SettingsIcon } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ManageServicePeriodsDialog } from './manage-service-periods-dialog'
import type { ServicePeriod } from '../_lib/service-periods'

interface ProductionSiteHeaderProps {
  kitchenId: string
  servicePeriods: ServicePeriod[]
  activeTab: string
  recipeToolbar: ReactNode
  batchToolbar: ReactNode
}

export function ProductionSiteHeader({
  kitchenId,
  servicePeriods,
  activeTab,
  recipeToolbar,
  batchToolbar,
}: ProductionSiteHeaderProps) {
  const [managePeriodsOpen, setManagePeriodsOpen] = useState(false)

  return (
    <>
      <SiteHeader title="Production">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TabsList variant="line">
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-1">
            {activeTab === 'recipes' ? recipeToolbar : batchToolbar}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Production options"
                >
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onSelect={() => setManagePeriodsOpen(true)}
                >
                  <SettingsIcon />
                  Manage Service Periods
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SiteHeader>
      <ManageServicePeriodsDialog
        open={managePeriodsOpen}
        onOpenChange={setManagePeriodsOpen}
        kitchenId={kitchenId}
        servicePeriods={servicePeriods}
      />
    </>
  )
}
