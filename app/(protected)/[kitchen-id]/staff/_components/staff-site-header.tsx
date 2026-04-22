'use client'

import type { ReactNode } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

interface StaffSiteHeaderProps {
  activeTab: string
  canReadStaff: boolean
  canReadScheduling: boolean
  staffToolbar: ReactNode
  shiftsToolbar: ReactNode
  assignmentsToolbar: ReactNode
}

export function StaffSiteHeader({
  activeTab,
  canReadStaff,
  canReadScheduling,
  staffToolbar,
  shiftsToolbar,
  assignmentsToolbar,
}: StaffSiteHeaderProps) {
  const toolbar =
    activeTab === 'staff'
      ? staffToolbar
      : activeTab === 'shifts'
        ? shiftsToolbar
        : assignmentsToolbar

  return (
    <SiteHeader title="Staff">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TabsList variant="line">
          {canReadStaff ? <TabsTrigger value="staff">Staff</TabsTrigger> : null}
          {canReadScheduling ? <TabsTrigger value="shifts">Shifts</TabsTrigger> : null}
          {canReadScheduling ? (
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          ) : null}
        </TabsList>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
          {toolbar}
        </div>
      </div>
    </SiteHeader>
  )
}
