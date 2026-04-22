import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { StaffMain } from './_components/staff-main'
import { prefetchStaffTabs } from './_lib/prefetch'

export default async function StaffPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params
  const queryClient = await prefetchStaffTabs(kitchenId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StaffMain />
    </HydrationBoundary>
  )
}
