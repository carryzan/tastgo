'use client'
import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useKitchen } from '@/hooks/use-kitchen'
import { AddUOM } from '@/components/layout/settings/add-uom'
import { EditUOM } from '@/components/layout/settings/edit-uom'
import { DeleteUOM } from '@/components/layout/settings/delete-uom'
import { Button } from '@/components/ui/button'
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

interface UOM {
  id: string
  name: string
  abbreviation: string
  is_active: boolean
  created_at: string
}

export function UnitsOfMeasure() {
  const { unitsOfMeasure } = useKitchen()
  const [editUOM, setEditUOM] = useState<UOM | null>(null)
  const [deleteUOM, setDeleteUOM] = useState<UOM | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Units of Measure</h3>
        <p className="text-sm text-muted-foreground">
          Manage the units of measure used across your kitchen.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <AddUOM />
        </div>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Abbr</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {unitsOfMeasure.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No units of measure found. Add your first unit to get started.
                  </TableCell>
                </TableRow>
              ) : (
                (unitsOfMeasure as UOM[]).map((uom) => (
                  <TableRow key={uom.id}>
                    <TableCell>{uom.name}</TableCell>
                    <TableCell className="font-mono text-sm">{uom.abbreviation}</TableCell>
                    <TableCell>{uom.is_active ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell>
                      {new Date(uom.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuItem onSelect={() => setEditUOM(uom)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteUOM(uom)}>
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
      {editUOM && (
        <EditUOM
          uom={editUOM}
          open={!!editUOM}
          onOpenChange={(next) => { if (!next) setEditUOM(null) }}
        />
      )}
      {deleteUOM && (
        <DeleteUOM
          uom={deleteUOM}
          open={!!deleteUOM}
          onOpenChange={(next) => { if (!next) setDeleteUOM(null) }}
        />
      )}
    </div>
  )
}
