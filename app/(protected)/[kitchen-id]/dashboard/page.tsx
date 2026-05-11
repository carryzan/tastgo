import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { SiteHeader } from '@/components/layout/site-header'
import { DashboardMain } from './_components/dashboard-main'
import { DashboardMemberAvatars } from './_components/dashboard-member-avatars'
import { prefetchDashboard } from './_lib/prefetch'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params
  const queryClient = await prefetchDashboard(kitchenId)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader title="Dashboard">
        <div className="ml-auto shrink-0">
          <DashboardMemberAvatars />
        </div>
      </SiteHeader>
      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <DashboardMain kitchenId={kitchenId} />
        </HydrationBoundary>
      </main>
    </div>
  )
}
