import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { ProcurementMain } from './_components/procurement-main'
import { prefetchProcurementTabs } from './_lib/prefetch'

export default async function ProcurementPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params
  const queryClient = await prefetchProcurementTabs(kitchenId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProcurementMain />
    </HydrationBoundary>
  )
}
