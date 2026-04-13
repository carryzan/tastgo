import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { ProductionMain } from './_components/production-main'
import { getServicePeriods } from './_lib/service-periods'
import { prefetchProductionTabs } from './_lib/prefetch'

export default async function ProductionPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params

  const [initialServicePeriods, queryClient] = await Promise.all([
    getServicePeriods(kitchenId),
    prefetchProductionTabs(kitchenId),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductionMain initialServicePeriods={initialServicePeriods} />
    </HydrationBoundary>
  )
}
