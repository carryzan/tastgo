import { SiteHeader } from '@/components/layout/site-header'

export default function DashboardPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader title="Dashboard">
      </SiteHeader>
      <main className="flex flex-1 flex-col gap-4 px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">Protected route — session OK.</p>
        </div>
      </main>
    </div>
  )
}