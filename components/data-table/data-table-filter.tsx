'use client'

import { useState } from 'react'
import type { Table as TanStackTable, ColumnFilter } from '@tanstack/react-table'
import {
  ListFilterIcon,
  PlusIcon,
  Trash2Icon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  OPERATORS_BY_TYPE,
  parseServerFilterRow,
  patchServerFilterRow,
  type ColumnConfig,
  type ServerFilterRow,
} from '@/lib/types/data-table'
import { FilterValueCell } from '@/components/data-table/data-table-filter-value'

const TRIGGER_WIDE = 'w-full max-w-48'

function defaultColumnFilter(columnConfigs: ColumnConfig[]): ColumnFilter {
  const col = columnConfigs[0]
  const operators = col ? OPERATORS_BY_TYPE[col.type] : []
  const value: ServerFilterRow = {
    column: col?.column ?? '',
    operator: operators[0]?.value ?? '',
    value: '',
    valueTo: '',
  }
  return { id: crypto.randomUUID(), value }
}

interface DataTableFilterProps<TData> {
  table: TanStackTable<TData>
  columnConfigs: ColumnConfig[]
}

export function DataTableFilter<TData>({
  table,
  columnConfigs,
}: DataTableFilterProps<TData>) {
  const [open, setOpen] = useState(false)
  const columnFilters = table.getState().columnFilters

  function patchRow(filterId: string, patch: Partial<ServerFilterRow>) {
    table.setColumnFilters((prev) =>
      prev.map((cf) => {
        if (cf.id !== filterId) return cf
        const next = patchServerFilterRow(
          parseServerFilterRow(cf.value),
          patch,
          columnConfigs
        )
        return { ...cf, value: next }
      })
    )
  }

  function addFilter() {
    table.setColumnFilters((prev) => [...prev, defaultColumnFilter(columnConfigs)])
  }

  function removeFilter(filterId: string) {
    table.setColumnFilters((prev) => prev.filter((cf) => cf.id !== filterId))
  }

  function duplicateFilter(filterId: string) {
    table.setColumnFilters((prev) => {
      const idx = prev.findIndex((cf) => cf.id === filterId)
      if (idx === -1) return prev
      const row = parseServerFilterRow(prev[idx].value)
      const copy: ColumnFilter = {
        id: crypto.randomUUID(),
        value: { ...row },
      }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Filter"
          className="text-muted-foreground"
        >
          <ListFilterIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto min-w-80 p-1">
        <div className="flex flex-col gap-1">
          {columnFilters.map((cf) => {
            const row = parseServerFilterRow(cf.value)
            const colConfig = columnConfigs.find((c) => c.column === row.column)
            const operators = colConfig
              ? OPERATORS_BY_TYPE[colConfig.type]
              : []

            return (
              <div key={cf.id} className="flex items-center gap-1">
                <Label className="shrink-0 pl-2">Where</Label>
                <Select
                  value={row.column || undefined}
                  onValueChange={(val) => patchRow(cf.id, { column: val })}
                >
                  <SelectTrigger className={TRIGGER_WIDE}>
                    <SelectValue placeholder="Column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {columnConfigs.map((c) => (
                        <SelectItem key={c.column} value={c.column}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select
                  value={row.operator || undefined}
                  onValueChange={(val) => patchRow(cf.id, { operator: val })}
                  disabled={!colConfig}
                >
                  <SelectTrigger className={TRIGGER_WIDE}>
                    <SelectValue placeholder="is..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {operators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FilterValueCell
                  row={row}
                  colConfig={colConfig}
                  onChange={(value, valueTo) =>
                    patchRow(cf.id, { value, valueTo: valueTo ?? '' })
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground"
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => removeFilter(cf.id)}>
                      Remove filter
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => duplicateFilter(cf.id)}>
                      Duplicate filter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
          <Button
            type="button"
            variant="ghost"
            onClick={addFilter}
            className="w-full justify-start text-muted-foreground"
          >
            <PlusIcon />
            Add filter
          </Button>
          <Separator />
          <Button
            type="button"
            variant="ghost"
            disabled={columnFilters.length === 0}
            onClick={() => table.setColumnFilters([])}
            className="w-full justify-start text-muted-foreground"
          >
            <Trash2Icon />
            Remove all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
