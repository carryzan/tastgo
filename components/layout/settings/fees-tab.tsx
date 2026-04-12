'use client'
import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useKitchen } from '@/hooks/use-kitchen'
import { EditFee } from '@/components/layout/settings/edit-fee'
import { DeleteFee } from '@/components/layout/settings/delete-fee'
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

interface SourceFee {
  id: string
  source_id: string
  commission_rate: number
  commission_basis: 'before_discount' | 'after_discount'
  fixed_fee: number
  effective_from: string
  created_at: string
}

export function FeesTab() {
  const { sources } = useKitchen()
  const [editFee, setEditFee] = useState<SourceFee | null>(null)
  const [deleteFee, setDeleteFee] = useState<SourceFee | null>(null)

  const fees = (sources as { source_fees: SourceFee[] }[]).flatMap((s) => s.source_fees ?? [])
  const sourceMap = Object.fromEntries(
    (sources as { id: string; name: string; logo_url: string | null }[]).map((s) => [s.id, s])
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground">Source</TableHead>
              <TableHead className="text-muted-foreground">Commission</TableHead>
              <TableHead className="text-muted-foreground">Basis</TableHead>
              <TableHead className="text-muted-foreground">Fixed Fee</TableHead>
              <TableHead className="text-muted-foreground">Effective From</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No fees found. Add your first fee to get started.
                </TableCell>
              </TableRow>
            ) : (
              fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarImage src={sourceMap[fee.source_id]?.logo_url ?? undefined} alt={sourceMap[fee.source_id]?.name} />
                      <AvatarFallback>{sourceMap[fee.source_id]?.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {sourceMap[fee.source_id]?.name ?? '—'}
                  </TableCell>
                  <TableCell>{fee.commission_rate}%</TableCell>
                  <TableCell>
                    {fee.commission_basis === 'before_discount' ? 'Before discount' : 'After discount'}
                  </TableCell>
                  <TableCell>{fee.fixed_fee}</TableCell>
                  <TableCell>
                    {new Date(fee.effective_from).toLocaleDateString(undefined, {
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
                          <DropdownMenuItem onSelect={() => setEditFee(fee)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteFee(fee)}>
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
      {editFee && (
        <EditFee
          fee={editFee}
          open={!!editFee}
          onOpenChange={(next) => { if (!next) setEditFee(null) }}
        />
      )}
      {deleteFee && (
        <DeleteFee
          fee={deleteFee}
          open={!!deleteFee}
          onOpenChange={(next) => { if (!next) setDeleteFee(null) }}
        />
      )}
    </div>
  )
}