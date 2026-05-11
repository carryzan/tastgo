'use client'

import { useEffect, useState } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { getAuditLog } from '@/lib/supabase/queries/audit-log'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AuditLogRow {
  id: string
  action_type: string
  table_name: string
  record_id: string
  created_at: string
  performer: {
    id: string
    profiles: { full_name: string | null } | null
  } | null
}

function humanizeTableName(tableName: string) {
  return tableName
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function actionBadgeVariant(
  action: string
): 'default' | 'secondary' | 'destructive' {
  if (action === 'DELETE') return 'destructive'
  if (action === 'UPDATE') return 'secondary'
  return 'default'
}

export function AuditLog() {
  const { kitchen } = useKitchen()
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await getAuditLog(kitchen.id)
      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
        setRows([])
      } else {
        setRows(((data ?? []) as unknown) as AuditLogRow[])
      }
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [kitchen.id])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Audit Log</h3>
        <p className="text-sm text-muted-foreground">
          View activity and change history.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground">Action</TableHead>
                <TableHead className="text-muted-foreground">Table</TableHead>
                <TableHead className="text-muted-foreground">
                  Performed by
                </TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-36" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No audit entries yet. Changes to your kitchen data will
                    appear here.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const performerName =
                    row.performer?.profiles?.full_name?.trim() || 'Unknown'
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Badge variant={actionBadgeVariant(row.action_type)}>
                          {row.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{humanizeTableName(row.table_name)}</TableCell>
                      <TableCell>{performerName}</TableCell>
                      <TableCell>
                        {new Date(row.created_at).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
