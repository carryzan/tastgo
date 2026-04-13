'use client'

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { AddServicePeriod } from './add-service-period'
import { EditServicePeriod } from './edit-service-period'
import { DeleteServicePeriod } from './delete-service-period'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ServicePeriod } from '../_lib/service-periods'

interface ManageServicePeriodsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
  servicePeriods: ServicePeriod[]
}

export function ManageServicePeriodsDialog({
  open,
  onOpenChange,
  kitchenId,
  servicePeriods,
}: ManageServicePeriodsDialogProps) {
  const [editPeriod, setEditPeriod] = useState<ServicePeriod | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServicePeriod | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col gap-3 overflow-hidden min-w-[450px] min-h-[400px]">
          <DialogHeader>
            <DialogTitle>Service Periods</DialogTitle>
            <DialogDescription>
              Manage your production service periods.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex justify-end">
              <AddServicePeriod
                kitchenId={kitchenId}
                servicePeriods={servicePeriods}
              />
            </div>
            <div className="rounded-xl border overflow-hidden">
              <div className="max-h-[min(300px,50vh)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-muted-foreground">
                        Period
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Created
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicePeriods.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-muted-foreground"
                        >
                          No service periods found. Add your first one to get
                          started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      servicePeriods.map((sp) => (
                        <TableRow key={sp.id}>
                          <TableCell className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarFallback>
                                {sp.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {sp.name}
                          </TableCell>
                          <TableCell>
                            {sp.is_active ? 'Active' : 'Inactive'}
                          </TableCell>
                          <TableCell>
                            {new Date(sp.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    onSelect={() => setEditPeriod(sp)}
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setDeleteTarget(sp)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {editPeriod && (
        <EditServicePeriod
          kitchenId={kitchenId}
          servicePeriods={servicePeriods}
          servicePeriod={editPeriod}
          open={!!editPeriod}
          onOpenChange={(next) => {
            if (!next) setEditPeriod(null)
          }}
        />
      )}
      {deleteTarget && (
        <DeleteServicePeriod
          kitchenId={kitchenId}
          servicePeriod={deleteTarget}
          open={!!deleteTarget}
          onOpenChange={(next) => {
            if (!next) setDeleteTarget(null)
          }}
        />
      )}
    </>
  )
}
