'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/hooks/use-kitchen'

type KitchenAssetEntity = 'brands' | 'sources' | 'menu-items' | 'combos' | 'inventory'

export function useKitchenUpload(entity: KitchenAssetEntity) {
  const { kitchen } = useKitchen()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getPath(file: File) {
    const ext = file.name.split('.').pop()
    return `${kitchen.id}/${entity}/${crypto.randomUUID()}.${ext}`
  }

  function getPathFromUrl(url: string) {
    return url.split('/kitchen-assets/')[1] ?? null
  }

  async function upload(file: File, previousUrl?: string | null): Promise<string | null> {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    if (previousUrl) {
      const previousPath = getPathFromUrl(previousUrl)
      if (previousPath) {
        await supabase.storage.from('kitchen-assets').remove([previousPath])
      }
    }

    const path = getPath(file)
    const { error } = await supabase.storage
      .from('kitchen-assets')
      .upload(path, file)

    if (error) {
      setError(error.message)
      setLoading(false)
      return null
    }

    const { data } = supabase.storage.from('kitchen-assets').getPublicUrl(path)
    setLoading(false)
    return data.publicUrl
  }

  async function remove(url: string): Promise<boolean> {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const path = getPathFromUrl(url)
    if (!path) {
      setLoading(false)
      return false
    }

    const { error } = await supabase.storage
      .from('kitchen-assets')
      .remove([path])

    if (error) {
      setError(error.message)
      setLoading(false)
      return false
    }

    setLoading(false)
    return true
  }

  return { upload, remove, loading, error }
}