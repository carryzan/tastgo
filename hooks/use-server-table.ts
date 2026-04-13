'use client'

import { useState, useDeferredValue, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type PaginationState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_SERVER_TABLE_PAGE_SIZE } from '@/lib/constants'
import type { ActiveFilter } from '@/lib/types/data-table'
import {
  parseServerFilterRow,
  serverFilterRowComplete,
  serverRowToActiveFilter,
} from '@/lib/types/data-table'

interface PageResult<TData> {
  rows: TData[]
  rowCount: number
}

const KITCHEN_ASSETS_BUCKET = 'kitchen-assets'

interface UseServerTableOptions<TData> {
  queryKey: string[]
  from: string
  select: string
  columns: ColumnDef<TData, unknown>[]
  searchColumn?: string
  defaultSort?: SortingState
  pageSize?: number
  kitchenId: string
  getKitchenAssetUrl?: (row: TData) => string | null
}

/**
 * Collect foreign table names from dot-notation column references
 * e.g. "production_recipes.name" → "production_recipes"
 */
function extractForeignTables(columns: string[]): Set<string> {
  const tables = new Set<string>()
  for (const col of columns) {
    const dotIndex = col.indexOf('.')
    if (dotIndex !== -1) tables.add(col.slice(0, dotIndex))
  }
  return tables
}

/**
 * For each foreign table being filtered/searched, inject `!inner` into the
 * select string so PostgREST excludes parent rows that have no matching child.
 *
 * e.g. "production_recipes!production_recipe_id(id, name)"
 *    → "production_recipes!production_recipe_id!inner(id, name)"
 */
function addInnerJoins(select: string, foreignTables: Set<string>): string {
  let result = select
  for (const table of foreignTables) {
    // Skip if !inner is already present for this table
    if (new RegExp(`${table}[^(]*!inner`).test(result)) continue
    // Insert !inner right before the opening parenthesis
    const regex = new RegExp(`(${table}[^(]*)(\\()`)
    result = result.replace(regex, '$1!inner$2')
  }
  return result
}

function applyFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filter: ActiveFilter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const { column, operator, value, valueTo } = filter

  switch (operator) {
    case 'eq':
      return query.eq(column, value)
    case 'neq':
      return query.neq(column, value)
    case 'gt':
      return query.gt(column, value)
    case 'lt':
      return query.lt(column, value)
    case 'gte':
      return query.gte(column, value)
    case 'lte':
      return query.lte(column, value)
    case 'ilike':
      return query.ilike(column, `%${value}%`)
    case 'starts_with':
      return query.ilike(column, `${value}%`)
    case 'ends_with':
      return query.ilike(column, `%${value}`)
    case 'between':
      return query.gte(column, value).lte(column, valueTo)
    default:
      return query
  }
}

export function useServerTable<TData extends { id: string }>({
  queryKey,
  from,
  select,
  columns,
  searchColumn,
  defaultSort = [{ id: 'created_at', desc: true }],
  pageSize = DEFAULT_SERVER_TABLE_PAGE_SIZE,
  kitchenId,
  getKitchenAssetUrl,
}: UseServerTableOptions<TData>) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

  const [sorting, setSorting] = useState<SortingState>(defaultSort)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  const activeFilters = useMemo((): ActiveFilter[] => {
    return columnFilters.flatMap((cf) => {
      const row = parseServerFilterRow(cf.value)
      if (!serverFilterRowComplete(row)) return []
      return [serverRowToActiveFilter(cf.id, row)]
    })
  }, [columnFilters])

  const fullQueryKey = useMemo(
    () => [
      ...queryKey,
      kitchenId,
      { sorting, filters: activeFilters, search: deferredSearch, pagination },
    ],
    [queryKey, kitchenId, sorting, activeFilters, deferredSearch, pagination]
  )

  const fetchPage = useCallback(
    async (pageIndex: number): Promise<PageResult<TData>> => {
      // Collect all foreign-table columns used in filters / search so we can
      // add !inner joins and ensure PostgREST excludes non-matching parents.
      const foreignCols = activeFilters.map((f) => f.column)
      if (deferredSearch && searchColumn) foreignCols.push(searchColumn)
      const foreignTables = extractForeignTables(foreignCols)
      const effectiveSelect = addInnerJoins(select, foreignTables)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from(from)
        .select(effectiveSelect, { count: 'exact' })
        .eq('kitchen_id', kitchenId)

      for (const filter of activeFilters) {
        query = applyFilter(query, filter)
      }

      if (deferredSearch && searchColumn) {
        query = query.ilike(searchColumn, `%${deferredSearch}%`)
      }

      if (sorting.length > 0) {
        for (const sort of sorting) {
          if (sort.id.includes('.')) {
            const dotIndex = sort.id.indexOf('.')
            const foreignTable = sort.id.slice(0, dotIndex)
            const column = sort.id.slice(dotIndex + 1)
            query = query.order(column, { ascending: !sort.desc, foreignTable })
          } else {
            query = query.order(sort.id, { ascending: !sort.desc })
          }
        }
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const rangeFrom = pageIndex * pagination.pageSize
      const rangeTo = rangeFrom + pagination.pageSize - 1
      query = query.range(rangeFrom, rangeTo)

      const { data: rows, error, count } = await query
      if (error) throw error
      return { rows: (rows ?? []) as TData[], rowCount: count ?? 0 }
    },
    [supabase, from, select, kitchenId, activeFilters, deferredSearch, searchColumn, sorting, pagination.pageSize]
  )

  const { data, isFetching } = useQuery<PageResult<TData>>({
    queryKey: fullQueryKey,
    queryFn: () => fetchPage(pagination.pageIndex),
    placeholderData: (prev) => prev,
  })

  // Prefetch the next page
  useEffect(() => {
    const totalPages = Math.ceil((data?.rowCount ?? 0) / pagination.pageSize)
    const nextPage = pagination.pageIndex + 1

    if (nextPage < totalPages) {
      const nextQueryKey = [
        ...queryKey,
        kitchenId,
        {
          sorting,
          filters: activeFilters,
          search: deferredSearch,
          pagination: { ...pagination, pageIndex: nextPage },
        },
      ]

      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: () => fetchPage(nextPage),
      })
    }
  }, [data, pagination, queryKey, kitchenId, sorting, activeFilters, deferredSearch, fetchPage, queryClient])

  // Reset pagination when search or filters change
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleColumnFiltersChange: typeof setColumnFilters = useCallback(
    (updater) => {
      setColumnFilters(updater)
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    []
  )

  const deleteMutation = useMutation({
    mutationFn: async (row: TData) => {
      const assetUrl = getKitchenAssetUrl?.(row)
      if (assetUrl) {
        const path = assetUrl.split(`/${KITCHEN_ASSETS_BUCKET}/`)[1]
        if (path) {
          await supabase.storage.from(KITCHEN_ASSETS_BUCKET).remove([path])
        }
      }

      const { error } = await supabase.from(from).delete().eq('id', row.id)
      if (error) throw error
    },
    onMutate: async (row) => {
      await queryClient.cancelQueries({ queryKey })
      const previousPages =
        queryClient.getQueriesData<PageResult<TData>>({ queryKey })

      queryClient.setQueriesData<PageResult<TData>>({ queryKey }, (old) => {
        if (!old) return old
        return {
          ...old,
          rows: old.rows.filter((r) => r.id !== row.id),
          rowCount: old.rowCount - 1,
        }
      })

      return { previousPages }
    },
    onError: (_err, _row, context) => {
      if (context?.previousPages) {
        for (const [key, data] of context.previousPages) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    rowCount: data?.rowCount ?? 0,
    state: { sorting, rowSelection, pagination, columnFilters },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnFiltersChange: handleColumnFiltersChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableRowSelection: true,
    enableMultiSort: true,
  })

  return {
    table,
    sorting,
    search,
    setSearch: handleSearch,
    isFetching,
    deleteMutation,
    rowSelection,
  }
}