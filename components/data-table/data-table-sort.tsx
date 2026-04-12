'use client'

import type { Table as TanStackTable } from '@tanstack/react-table'
import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ColumnConfig } from '@/lib/types/data-table'

interface DataTableSortProps<TData> {
  table: TanStackTable<TData>
  columnConfigs: ColumnConfig[]
}

export function DataTableSort<TData>({
  table,
  columnConfigs,
}: DataTableSortProps<TData>) {
  const sorting = table.getState().sorting
  const sortableConfigs = columnConfigs.filter((c) => c.sortable)
  const usedIds = new Set(sorting.map((s) => s.id))
  const availableToAdd = sortableConfigs.filter((c) => !usedIds.has(c.column))

  function addSort(colId: string) {
    table.setSorting([...sorting, { id: colId, desc: false }])
  }

  function removeSort(colId: string) {
    table.setSorting(sorting.filter((s) => s.id !== colId))
  }

  function updateSortColumn(index: number, newColId: string) {
    table.setSorting(sorting.map((s, i) => (i === index ? { ...s, id: newColId } : s)))
  }

  function updateSortDir(index: number, desc: boolean) {
    table.setSorting(sorting.map((s, i) => (i === index ? { ...s, desc } : s)))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Sort"
          className="text-muted-foreground"
        >
          <ArrowUpDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto min-w-80 p-1">
        <div className="flex flex-col gap-1">
          {sorting.map((sort, index) => {
            const rowUsedIds = new Set(
              sorting.map((s, i) => (i !== index ? s.id : null))
            )
            const rowAvailable = sortableConfigs.filter(
              (c) => !rowUsedIds.has(c.column)
            )

            return (
              <div key={`${sort.id}-${index}`} className="flex items-center gap-1">
                <Select
                  value={sort.id}
                  onValueChange={(val) => updateSortColumn(index, val)}
                >
                  <SelectTrigger className="w-full max-w-48">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {rowAvailable.map((c) => (
                        <SelectItem key={c.column} value={c.column}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select
                  value={sort.desc ? 'desc' : 'asc'}
                  onValueChange={(val) => updateSortDir(index, val === 'desc')}
                >
                  <SelectTrigger className="w-full max-w-48">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="asc">
                        <ArrowUpIcon className="size-3.5" />
                        Ascending
                      </SelectItem>
                      <SelectItem value="desc">
                        <ArrowDownIcon className="size-3.5" />
                        Descending
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => removeSort(sort.id)}
                >
                  <XIcon />
                </Button>
              </div>
            )
          })}
          {availableToAdd.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                >
                  <PlusIcon />
                  Add sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {availableToAdd.map((c) => (
                  <DropdownMenuItem key={c.column} onSelect={() => addSort(c.column)}>
                    {c.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
