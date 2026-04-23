import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { StockControlMain } from './_components/stock-control-main'
import { prefetchStockControlTabs } from './_lib/prefetch'

export default async function StockControlPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params
  const queryClient = await prefetchStockControlTabs(kitchenId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StockControlMain />
    </HydrationBoundary>
  )
}
