'use client'

import { useKitchen } from "@/hooks/use-kitchen"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Member {
  id: string
  is_active: boolean
  profiles: { full_name: string; phone: string | null }
  roles: { name: string } | null
}

export function People() {
  const { members } = useKitchen()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-medium">People</h3>
        <p className="text-sm text-muted-foreground">
          Manage team members and roles in your kitchen.
        </p>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground">Member</TableHead>
              <TableHead className="text-muted-foreground">Role</TableHead>
              <TableHead className="text-muted-foreground">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              (members as Member[]).map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarFallback>
                        {member.profiles.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span>{member.profiles.full_name}</span>
                      <span className="text-xs text-muted-foreground">{member.profiles.phone ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{member.roles?.name ?? '—'}</TableCell>
                  <TableCell>{member.is_active ? 'Full Access' : 'No Access'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}