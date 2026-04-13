'use client'

import { useMemo, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { AddMenu } from './add-menu'
import { EditMenu } from './edit-menu'
import { DeleteMenu } from './delete-menu'
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
import type { Menu } from '../_lib/menus'
import { useMenuBrandOptions } from './menu-brand-field'

interface ManageMenusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
  menus: Menu[]
}

export function ManageMenusDialog({
  open,
  onOpenChange,
  kitchenId,
  menus,
}: ManageMenusDialogProps) {
  const brands = useMenuBrandOptions()
  const [editMenu, setEditMenu] = useState<Menu | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Menu | null>(null)

  const brandNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const b of brands) m.set(b.id, b.name)
    return m
  }, [brands])

  const rows = useMemo(
    () =>
      [...menus].sort((a, b) => {
        const an = brandNameById.get(a.brand_id) ?? a.brand_id
        const bn = brandNameById.get(b.brand_id) ?? b.brand_id
        if (an !== bn) return an.localeCompare(bn)
        return a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      }),
    [menus, brandNameById]
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(560px,90vh)] min-h-[400px] min-w-[450px] flex-col gap-3 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Menus</DialogTitle>
            <DialogDescription>
              Categories per brand. Sort order controls listing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {brands.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Add a brand in kitchen settings before creating menus.
              </p>
            )}
            <div className="flex justify-end">
              <AddMenu kitchenId={kitchenId} menus={menus} />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border">
              <div className="max-h-[min(300px,50vh)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Brand</TableHead>
                      <TableHead className="text-muted-foreground">Menu</TableHead>
                      <TableHead className="text-muted-foreground">Order</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Created</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-muted-foreground"
                        >
                          No menus yet. Add one to assign menu items.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-muted-foreground">
                            {brandNameById.get(m.brand_id) ?? '—'}
                          </TableCell>
                          <TableCell className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarFallback>
                                {m.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {m.name}
                          </TableCell>
                          <TableCell>{m.sort_order}</TableCell>
                          <TableCell>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </TableCell>
                          <TableCell>
                            {new Date(m.created_at).toLocaleDateString(
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
                                    onSelect={() => setEditMenu(m)}
                                  >
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setDeleteTarget(m)}
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
      {editMenu && (
        <EditMenu
          kitchenId={kitchenId}
          menus={menus}
          menu={editMenu}
          open={!!editMenu}
          onOpenChange={(next) => {
            if (!next) setEditMenu(null)
          }}
        />
      )}
      {deleteTarget && (
        <DeleteMenu
          kitchenId={kitchenId}
          menu={deleteTarget}
          open={!!deleteTarget}
          onOpenChange={(next) => {
            if (!next) setDeleteTarget(null)
          }}
        />
      )}
    </>
  )
}
