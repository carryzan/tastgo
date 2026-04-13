import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { MenuMain } from './_components/menu-main'
import { getMenus } from './_lib/menus'
import { prefetchMenuTabs } from './_lib/prefetch'

export default async function MenuPage({
  params,
}: {
  params: Promise<{ 'kitchen-id': string }>
}) {
  const { 'kitchen-id': kitchenId } = await params

  const [initialMenus, queryClient] = await Promise.all([
    getMenus(kitchenId),
    prefetchMenuTabs(kitchenId),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MenuMain initialMenus={initialMenus} />
    </HydrationBoundary>
  )
}
