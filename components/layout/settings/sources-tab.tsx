'use client'
import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useKitchen } from '@/hooks/use-kitchen'
import { EditSource } from '@/components/layout/settings/edit-source'
import { DeleteSource } from '@/components/layout/settings/delete-source'
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

interface Source {
  id: string
  name: string
  type: string
  logo_url: string | null
  is_active: boolean
  created_at: string
}

export function SourcesTab() {
  const { sources } = useKitchen()
  const [editSource, setEditSource] = useState<Source | null>(null)
  const [deleteSource, setDeleteSource] = useState<Source | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground">Source</TableHead>
              <TableHead className="text-muted-foreground">Type</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Created</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No sources found. Add your first source to get started.
                </TableCell>
              </TableRow>
            ) : (
              (sources as Source[]).map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarImage src={source.logo_url ?? undefined} alt={source.name} />
                      <AvatarFallback>{source.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {source.name}
                  </TableCell>
                  <TableCell className="capitalize">{source.type}</TableCell>
                  <TableCell>{source.is_active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
                    {new Date(source.created_at).toLocaleDateString(undefined, {
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
                          <DropdownMenuItem onSelect={() => setEditSource(source)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteSource(source)}>
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
      {editSource && (
        <EditSource
          source={editSource}
          open={!!editSource}
          onOpenChange={(next) => { if (!next) setEditSource(null) }}
        />
      )}
      {deleteSource && (
        <DeleteSource
          source={deleteSource}
          open={!!deleteSource}
          onOpenChange={(next) => { if (!next) setDeleteSource(null) }}
        />
      )}
    </div>
  )
}