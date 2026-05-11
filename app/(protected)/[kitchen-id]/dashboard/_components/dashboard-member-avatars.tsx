'use client'

import { useKitchen } from '@/hooks/use-kitchen'
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'

interface KitchenMember {
  id: string
  profiles: { full_name: string } | null
}

const VISIBLE_COUNT = 3

function initials(fullName: string): string {
  const trimmed = fullName.trim()
  if (trimmed.length === 0) return '?'
  return trimmed.slice(0, 2).toUpperCase()
}

export function DashboardMemberAvatars() {
  const { members } = useKitchen()
  const roster = (members as KitchenMember[]).filter(
    (m) => m.profiles?.full_name
  )

  if (roster.length === 0) {
    return null
  }

  const visible = roster.slice(0, VISIBLE_COUNT)
  const overflow = roster.length - visible.length

  return (
    <AvatarGroup className="shrink-0" aria-label="Kitchen team members">
      {visible.map((member) => {
        const name = member.profiles?.full_name ?? ''
        return (
          <Avatar key={member.id}>
            <AvatarFallback title={name}>{initials(name)}</AvatarFallback>
          </Avatar>
        )
      })}
      {overflow > 0 ? (
        <AvatarGroupCount>+{overflow}</AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  )
}
