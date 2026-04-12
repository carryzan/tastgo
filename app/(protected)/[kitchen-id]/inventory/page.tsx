import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { InventoryMain } from './_components/inventory-main'
import { getInventoryCategories } from './_lib/inventory-categories'
import { prefetchInventoryItems } from './_lib/prefetch'

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params

  const [initialCategories, queryClient] = await Promise.all([
    getInventoryCategories(kitchenId),
    prefetchInventoryItems(kitchenId),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryMain initialCategories={initialCategories} />
    </HydrationBoundary>
  )
}
