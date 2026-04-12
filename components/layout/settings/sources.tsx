'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddSource } from '@/components/layout/settings/add-source'
import { AddFee } from '@/components/layout/settings/add-fee'
import { SourcesTab } from '@/components/layout/settings/sources-tab'
import { FeesTab } from '@/components/layout/settings/fees-tab'

export function Sources() {
  const [tab, setTab] = useState('sources')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">Sources</h3>
        <p className="text-sm text-muted-foreground">
          Manage kitchen sources and fees.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>
          {tab === 'sources' ? <AddSource /> : <AddFee />}
        </div>
        <TabsContent value="sources" className="mt-3">
          <SourcesTab />
        </TabsContent>
        <TabsContent value="fees" className="mt-3">
          <FeesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}