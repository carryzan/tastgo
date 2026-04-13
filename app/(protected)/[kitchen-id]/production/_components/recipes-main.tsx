'use client'

import type { Table } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table/data-table'
import type { Recipe } from './recipe-columns'

interface RecipesMainProps {
  table: Table<Recipe>
  isFetching: boolean
}

export function RecipesMain({ table, isFetching }: RecipesMainProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable table={table} isFetching={isFetching} />
    </div>
  )
}
