'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Row } from '@tanstack/react-table'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { Permission } from '@/lib/types/data-table'
import { ProductionSiteHeader } from './production-site-header'
import { RecipesMain } from './recipes-main'
import { BatchesMain } from './batches-main'
import { CreateBatchDialog } from './create-batch-dialog'
import { AddRecipeSheet } from './add-recipe-sheet'
import { EditRecipeSheet } from './edit-recipe-dialog'
import { RecipeVersionSheet } from './recipe-version-sheet'
import { CompleteBatchDialog } from './complete-batch-dialog'
import { DataTableDeleteDialog } from '@/components/data-table/data-table-delete-dialog'
import {
  getRecipeColumns,
  recipeColumnConfigs,
  type Recipe,
} from './recipe-columns'
import {
  getBatchColumns,
  batchColumnConfigs,
  type Batch,
} from './batch-columns'
import {
  RECIPES_QUERY_KEY,
  RECIPES_FROM,
  RECIPES_SELECT,
  BATCHES_QUERY_KEY,
  BATCHES_FROM,
  BATCHES_SELECT,
} from '../_lib/queries'
import type { ServicePeriod } from '../_lib/service-periods'

interface ProductionMainProps {
  initialServicePeriods: ServicePeriod[]
}

export function ProductionMain({ initialServicePeriods }: ProductionMainProps) {
  const { kitchen } = useKitchen()
  const [activeTab, setActiveTab] = useState('recipes')

  const permissions = useMemo<Permission>(
    () => ({ canEdit: true, canDelete: true }),
    []
  )

  // Recipe state
  const [addRecipeOpen, setAddRecipeOpen] = useState(false)
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null)
  const [deleteRecipe, setDeleteRecipe] = useState<Recipe | null>(null)
  const [versionRecipe, setVersionRecipe] = useState<Recipe | null>(null)

  const handleEditRecipe = useCallback(
    (row: Row<Recipe>) => setEditRecipe(row.original),
    []
  )
  const handleDeleteRecipe = useCallback(
    (row: Row<Recipe>) => setDeleteRecipe(row.original),
    []
  )
  const handleManageVersions = useCallback(
    (row: Row<Recipe>) => setVersionRecipe(row.original),
    []
  )

  const recipeColumns = useMemo(
    () =>
      getRecipeColumns(permissions, {
        onEdit: handleEditRecipe,
        onDelete: handleDeleteRecipe,
        onManageVersions: handleManageVersions,
      }),
    [permissions, handleEditRecipe, handleDeleteRecipe, handleManageVersions]
  )

  const {
    table: recipeTable,
    isFetching: recipesFetching,
    deleteMutation: recipeDeleteMutation,
    search: recipeSearch,
    setSearch: setRecipeSearch,
  } = useServerTable<Recipe>({
    queryKey: RECIPES_QUERY_KEY,
    from: RECIPES_FROM,
    select: RECIPES_SELECT,
    columns: recipeColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
  })

  // Batch state
  const [completeBatch, setCompleteBatch] = useState<Batch | null>(null)
  const [deleteBatch, setDeleteBatch] = useState<Batch | null>(null)

  const handleDeleteBatch = useCallback(
    (row: Row<Batch>) => setDeleteBatch(row.original),
    []
  )
  const handleCompleteBatch = useCallback(
    (row: Row<Batch>) => setCompleteBatch(row.original),
    []
  )

  const batchColumns = useMemo(
    () =>
      getBatchColumns(permissions, {
        onDelete: handleDeleteBatch,
        onComplete: handleCompleteBatch,
      }),
    [permissions, handleDeleteBatch, handleCompleteBatch]
  )

  const {
    table: batchTable,
    isFetching: batchesFetching,
    deleteMutation: batchDeleteMutation,
    search: batchSearch,
    setSearch: setBatchSearch,
  } = useServerTable<Batch>({
    queryKey: BATCHES_QUERY_KEY,
    from: BATCHES_FROM,
    select: BATCHES_SELECT,
    columns: batchColumns,
    kitchenId: kitchen.id,
  })

  const recipeToolbar: ReactNode = (
    <>
      <ExpandableSearch value={recipeSearch} onChange={setRecipeSearch} />
      <DataTableFilter table={recipeTable} columnConfigs={recipeColumnConfigs} />
      <DataTableSort table={recipeTable} columnConfigs={recipeColumnConfigs} />
      <Button size="sm" onClick={() => setAddRecipeOpen(true)}>
        Add Recipe
      </Button>
    </>
  )

  const batchToolbar: ReactNode = (
    <>
      <ExpandableSearch value={batchSearch} onChange={setBatchSearch} />
      <DataTableFilter table={batchTable} columnConfigs={batchColumnConfigs} />
      <DataTableSort table={batchTable} columnConfigs={batchColumnConfigs} />
      <CreateBatchDialog servicePeriods={initialServicePeriods} />
    </>
  )

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <ProductionSiteHeader
          kitchenId={kitchen.id}
          servicePeriods={initialServicePeriods}
          activeTab={activeTab}
          recipeToolbar={recipeToolbar}
          batchToolbar={batchToolbar}
        />
        <TabsContent
          value="recipes"
          className="flex min-h-0 flex-1 flex-col mt-0"
        >
          <RecipesMain
            table={recipeTable}
            isFetching={recipesFetching}
          />
        </TabsContent>
        <TabsContent
          value="batches"
          className="flex min-h-0 flex-1 flex-col mt-0"
        >
          <BatchesMain
            table={batchTable}
            isFetching={batchesFetching}
          />
        </TabsContent>
      </Tabs>

      <AddRecipeSheet open={addRecipeOpen} onOpenChange={setAddRecipeOpen} />
      {editRecipe && (
        <EditRecipeSheet
          recipe={editRecipe}
          open={!!editRecipe}
          onOpenChange={(next) => {
            if (!next) setEditRecipe(null)
          }}
        />
      )}
      {versionRecipe && (
        <RecipeVersionSheet
          recipe={versionRecipe}
          open={!!versionRecipe}
          onOpenChange={(next) => {
            if (!next) setVersionRecipe(null)
          }}
        />
      )}
      <DataTableDeleteDialog
        open={deleteRecipe !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRecipe(null)
        }}
        onConfirm={() => {
          if (deleteRecipe) {
            recipeDeleteMutation.mutate(deleteRecipe, {
              onSuccess: () => setDeleteRecipe(null),
            })
          }
        }}
        isLoading={recipeDeleteMutation.isPending}
      />
      {completeBatch && (
        <CompleteBatchDialog
          batch={completeBatch}
          open={!!completeBatch}
          onOpenChange={(next) => {
            if (!next) setCompleteBatch(null)
          }}
        />
      )}
      <DataTableDeleteDialog
        open={deleteBatch !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteBatch(null)
        }}
        onConfirm={() => {
          if (deleteBatch) {
            batchDeleteMutation.mutate(deleteBatch, {
              onSuccess: () => setDeleteBatch(null),
            })
          }
        }}
        isLoading={batchDeleteMutation.isPending}
      />
    </>
  )
}
