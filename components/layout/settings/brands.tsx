'use client'
import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useKitchen } from '@/hooks/use-kitchen'
import { AddBrand } from '@/components/layout/settings/add-brand'
import { EditBrand } from '@/components/layout/settings/edit-brand'
import { DeleteBrand } from '@/components/layout/settings/delete-brand'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

interface Brand {
  id: string
  name: string
  logo_url: string | null
  is_active: boolean
  created_at: string
}

export function Brands() {
  const { brands } = useKitchen()
  const [editBrand, setEditBrand] = useState<Brand | null>(null)
  const [deleteBrand, setDeleteBrand] = useState<Brand | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Brands</h3>
        <p className="text-sm text-muted-foreground">
          Manage your kitchen brands.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <AddBrand />
        </div>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground">Brand</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No brands found. Add your first brand to get started.
                  </TableCell>
                </TableRow>
              ) : (
                (brands as Brand[]).map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarImage src={brand.logo_url ?? undefined} alt={brand.name} />
                        <AvatarFallback>
                          {brand.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {brand.name}
                    </TableCell>
                    <TableCell>
                      {brand.is_active ? 'Active' : 'Inactive'}
                    </TableCell>
                    <TableCell>
                      {new Date(brand.created_at).toLocaleDateString(undefined, {
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
                            <DropdownMenuItem onSelect={() => setEditBrand(brand)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteBrand(brand)}>
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
      {editBrand && (
        <EditBrand
          brand={editBrand}
          open={!!editBrand}
          onOpenChange={(next) => { if (!next) setEditBrand(null) }}
        />
      )}
      {deleteBrand && (
        <DeleteBrand
          brand={deleteBrand}
          open={!!deleteBrand}
          onOpenChange={(next) => { if (!next) setDeleteBrand(null) }}
        />
      )}
    </div>
  )
}