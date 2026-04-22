'use client'

import { useCallback, useMemo, useState, useTransition, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Row } from '@tanstack/react-table'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableDeleteDialog } from '@/components/data-table/data-table-delete-dialog'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { Permission } from '@/lib/types/data-table'
import {
  fetchStaffMembers,
  fetchWorkShifts,
} from '../_lib/client-queries'
import { deleteStaffMember } from '../_lib/staff-actions'
import { deleteWorkShift } from '../_lib/shift-actions'
import { deleteShiftAssignment } from '../_lib/assignment-actions'
import {
  STAFF_MEMBERS_QUERY_KEY,
  STAFF_MEMBERS_FROM,
  STAFF_MEMBERS_SELECT,
  WORK_SHIFTS_QUERY_KEY,
  WORK_SHIFTS_FROM,
  WORK_SHIFTS_SELECT,
  SHIFT_ASSIGNMENTS_QUERY_KEY,
  SHIFT_ASSIGNMENTS_FROM,
  SHIFT_ASSIGNMENTS_SELECT,
  type StaffMember,
  type WorkShift,
  type ShiftAssignment,
} from '../_lib/queries'
import {
  getStaffMemberColumns,
  staffMemberColumnConfigs,
} from './staff-member-columns'
import {
  getWorkShiftColumns,
  workShiftColumnConfigs,
} from './work-shift-columns'
import {
  getShiftAssignmentColumns,
  getShiftAssignmentColumnConfigs,
} from './shift-assignment-columns'
import { StaffSiteHeader } from './staff-site-header'
import { StaffMemberSheet } from './staff-member-sheet'
import { WorkShiftDialog } from './work-shift-dialog'
import { ShiftAssignmentDialog } from './shift-assignment-dialog'
import { AttendanceDialog } from './attendance-dialog'

export function StaffMain() {
  const { kitchen, permissions } = useKitchen()
  const queryClient = useQueryClient()
  const canReadStaff = permissions.has('staff.read')
  const canCreateStaff = permissions.has('staff.create')
  const canUpdateStaff = permissions.has('staff.update')
  const canDeleteStaff = permissions.has('staff.delete')
  const canReadScheduling = permissions.has('scheduling.read')
  const canCreateScheduling = permissions.has('scheduling.create')
  const canUpdateScheduling = permissions.has('scheduling.update')
  const canDeleteScheduling = permissions.has('scheduling.delete')

  const [activeTab, setActiveTab] = useState(() => (canReadStaff ? 'staff' : 'shifts'))
  const resolvedActiveTab =
    activeTab === 'staff' && !canReadStaff
      ? 'shifts'
      : (activeTab === 'shifts' || activeTab === 'assignments') && !canReadScheduling
        ? canReadStaff
          ? 'staff'
          : 'shifts'
        : activeTab

  const { data: staffOptions = [] } = useQuery({
    queryKey: ['staff-filter-members', kitchen.id],
    queryFn: () => fetchStaffMembers(kitchen.id),
    enabled: canReadStaff,
  })
  const { data: shiftOptions = [] } = useQuery({
    queryKey: ['work-shifts-picker', kitchen.id],
    queryFn: () => fetchWorkShifts(kitchen.id),
    enabled: canReadScheduling,
  })

  const staffPermissions = useMemo<Permission>(
    () => ({
      canEdit: canUpdateStaff,
      canDelete: canDeleteStaff,
    }),
    [canDeleteStaff, canUpdateStaff]
  )
  const schedulingPermissions = useMemo<Permission>(
    () => ({
      canEdit: canUpdateScheduling,
      canDelete: canDeleteScheduling,
    }),
    [canDeleteScheduling, canUpdateScheduling]
  )

  const [staffSheetOpen, setStaffSheetOpen] = useState(false)
  const [editStaffMember, setEditStaffMember] = useState<StaffMember | null>(null)
  const [deleteStaffTarget, setDeleteStaffTarget] = useState<StaffMember | null>(null)
  const [deleteStaffError, setDeleteStaffError] = useState<string | null>(null)
  const [deleteStaffPending, startDeleteStaffTransition] = useTransition()

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false)
  const [editShift, setEditShift] = useState<WorkShift | null>(null)
  const [deleteShiftTarget, setDeleteShiftTarget] = useState<WorkShift | null>(null)
  const [deleteShiftError, setDeleteShiftError] = useState<string | null>(null)
  const [deleteShiftPending, startDeleteShiftTransition] = useTransition()

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [editAssignment, setEditAssignment] = useState<ShiftAssignment | null>(null)
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] =
    useState<ShiftAssignment | null>(null)
  const [deleteAssignmentError, setDeleteAssignmentError] = useState<string | null>(null)
  const [deleteAssignmentPending, startDeleteAssignmentTransition] = useTransition()

  const [attendanceMode, setAttendanceMode] = useState<'check-in' | 'check-out'>('check-in')
  const [attendanceTarget, setAttendanceTarget] = useState<ShiftAssignment | null>(null)

  const handleEditStaffMember = useCallback((row: Row<StaffMember>) => {
    setEditStaffMember(row.original)
    setStaffSheetOpen(true)
  }, [])
  const handleDeleteStaffMember = useCallback((row: Row<StaffMember>) => {
    setDeleteStaffTarget(row.original)
    setDeleteStaffError(null)
  }, [])

  const staffColumns = useMemo(
    () =>
      getStaffMemberColumns(staffPermissions, {
        onEdit: handleEditStaffMember,
        onDelete: handleDeleteStaffMember,
      }),
    [handleDeleteStaffMember, handleEditStaffMember, staffPermissions]
  )

  const {
    table: staffTable,
    isFetching: staffFetching,
    search: staffSearch,
    setSearch: setStaffSearch,
  } = useServerTable<StaffMember>({
    queryKey: STAFF_MEMBERS_QUERY_KEY,
    from: STAFF_MEMBERS_FROM,
    select: STAFF_MEMBERS_SELECT,
    columns: staffColumns,
    searchColumn: 'full_name',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'full_name', desc: false }],
  })

  const handleEditShift = useCallback((row: Row<WorkShift>) => {
    setEditShift(row.original)
    setShiftDialogOpen(true)
  }, [])
  const handleDeleteShift = useCallback((row: Row<WorkShift>) => {
    setDeleteShiftTarget(row.original)
    setDeleteShiftError(null)
  }, [])

  const shiftColumns = useMemo(
    () =>
      getWorkShiftColumns(schedulingPermissions, {
        onEdit: handleEditShift,
        onDelete: handleDeleteShift,
      }),
    [handleDeleteShift, handleEditShift, schedulingPermissions]
  )

  const {
    table: shiftsTable,
    isFetching: shiftsFetching,
    search: shiftsSearch,
    setSearch: setShiftsSearch,
  } = useServerTable<WorkShift>({
    queryKey: WORK_SHIFTS_QUERY_KEY,
    from: WORK_SHIFTS_FROM,
    select: WORK_SHIFTS_SELECT,
    columns: shiftColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'start_time', desc: true }],
  })

  const handleEditAssignment = useCallback((row: Row<ShiftAssignment>) => {
    setEditAssignment(row.original)
    setAssignmentDialogOpen(true)
  }, [])
  const handleDeleteAssignment = useCallback((row: Row<ShiftAssignment>) => {
    setDeleteAssignmentTarget(row.original)
    setDeleteAssignmentError(null)
  }, [])
  const handleCheckIn = useCallback((row: Row<ShiftAssignment>) => {
    setAttendanceMode('check-in')
    setAttendanceTarget(row.original)
  }, [])
  const handleCheckOut = useCallback((row: Row<ShiftAssignment>) => {
    setAttendanceMode('check-out')
    setAttendanceTarget(row.original)
  }, [])

  const assignmentColumns = useMemo(
    () =>
      getShiftAssignmentColumns(schedulingPermissions, {
        onEdit: handleEditAssignment,
        onDelete: handleDeleteAssignment,
        onCheckIn: handleCheckIn,
        onCheckOut: handleCheckOut,
        canManageAttendance: canUpdateScheduling,
      }),
    [
      canUpdateScheduling,
      handleCheckIn,
      handleCheckOut,
      handleDeleteAssignment,
      handleEditAssignment,
      schedulingPermissions,
    ]
  )

  const assignmentColumnConfigs = useMemo(
    () =>
      getShiftAssignmentColumnConfigs({
        staffNames: staffOptions.map((staffMember) => staffMember.full_name),
        shiftNames: shiftOptions.map((shift) => shift.name),
      }),
    [shiftOptions, staffOptions]
  )

  const {
    table: assignmentsTable,
    isFetching: assignmentsFetching,
    search: assignmentsSearch,
    setSearch: setAssignmentsSearch,
  } = useServerTable<ShiftAssignment>({
    queryKey: SHIFT_ASSIGNMENTS_QUERY_KEY,
    from: SHIFT_ASSIGNMENTS_FROM,
    select: SHIFT_ASSIGNMENTS_SELECT,
    columns: assignmentColumns,
    searchColumn: 'shift.name',
    kitchenId: kitchen.id,
    defaultSort: [{ id: 'created_at', desc: true }],
  })

  const staffToolbar: ReactNode = (
    <>
      <ExpandableSearch value={staffSearch} onChange={setStaffSearch} />
      <DataTableFilter table={staffTable} columnConfigs={staffMemberColumnConfigs} />
      <DataTableSort table={staffTable} columnConfigs={staffMemberColumnConfigs} />
      {canCreateStaff ? (
        <Button
          size="sm"
          onClick={() => {
            setEditStaffMember(null)
            setStaffSheetOpen(true)
          }}
        >
          Add Staff
        </Button>
      ) : null}
    </>
  )

  const shiftsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={shiftsSearch} onChange={setShiftsSearch} />
      <DataTableFilter table={shiftsTable} columnConfigs={workShiftColumnConfigs} />
      <DataTableSort table={shiftsTable} columnConfigs={workShiftColumnConfigs} />
      {canCreateScheduling ? (
        <Button
          size="sm"
          onClick={() => {
            setEditShift(null)
            setShiftDialogOpen(true)
          }}
        >
          Add Shift
        </Button>
      ) : null}
    </>
  )

  const assignmentsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={assignmentsSearch} onChange={setAssignmentsSearch} />
      <DataTableFilter table={assignmentsTable} columnConfigs={assignmentColumnConfigs} />
      <DataTableSort table={assignmentsTable} columnConfigs={assignmentColumnConfigs} />
      {canCreateScheduling ? (
        <Button
          size="sm"
          onClick={() => {
            setEditAssignment(null)
            setAssignmentDialogOpen(true)
          }}
          disabled={!canReadStaff}
        >
          Assign Staff
        </Button>
      ) : null}
    </>
  )

  if (!canReadStaff && !canReadScheduling) {
    return <div className="flex min-h-0 flex-1 flex-col" />
  }

  return (
    <>
      <Tabs
        value={resolvedActiveTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <StaffSiteHeader
          activeTab={resolvedActiveTab}
          canReadStaff={canReadStaff}
          canReadScheduling={canReadScheduling}
          staffToolbar={staffToolbar}
          shiftsToolbar={shiftsToolbar}
          assignmentsToolbar={assignmentsToolbar}
        />

        {canReadStaff ? (
          <TabsContent value="staff" className="mt-0 flex min-h-0 flex-1 flex-col">
            <DataTable table={staffTable} isFetching={staffFetching} />
          </TabsContent>
        ) : null}

        {canReadScheduling ? (
          <TabsContent value="shifts" className="mt-0 flex min-h-0 flex-1 flex-col">
            <DataTable table={shiftsTable} isFetching={shiftsFetching} />
          </TabsContent>
        ) : null}

        {canReadScheduling ? (
          <TabsContent value="assignments" className="mt-0 flex min-h-0 flex-1 flex-col">
            <DataTable table={assignmentsTable} isFetching={assignmentsFetching} />
          </TabsContent>
        ) : null}
      </Tabs>

      {staffSheetOpen ? (
        <StaffMemberSheet
          open={staffSheetOpen}
          onOpenChange={(next) => {
            setStaffSheetOpen(next)
            if (!next) setEditStaffMember(null)
          }}
          staffMember={editStaffMember}
        />
      ) : null}
      {shiftDialogOpen ? (
        <WorkShiftDialog
          open={shiftDialogOpen}
          onOpenChange={(next) => {
            setShiftDialogOpen(next)
            if (!next) setEditShift(null)
          }}
          shift={editShift}
        />
      ) : null}
      {assignmentDialogOpen ? (
        <ShiftAssignmentDialog
          open={assignmentDialogOpen}
          onOpenChange={(next) => {
            setAssignmentDialogOpen(next)
            if (!next) setEditAssignment(null)
          }}
          assignment={editAssignment}
          canReadStaff={canReadStaff}
        />
      ) : null}
      {attendanceTarget ? (
        <AttendanceDialog
          open={attendanceTarget !== null}
          onOpenChange={(next) => {
            if (!next) setAttendanceTarget(null)
          }}
          assignment={attendanceTarget}
          mode={attendanceMode}
        />
      ) : null}

      <DataTableDeleteDialog
        open={deleteStaffTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteStaffTarget(null)
            setDeleteStaffError(null)
          }
        }}
        description={
          deleteStaffError
            ? `Delete this staff member only if they are not referenced by expenses or shift assignments. ${deleteStaffError}`
            : 'Delete this staff member only if they are not referenced by expenses or shift assignments.'
        }
        onConfirm={() => {
          if (!deleteStaffTarget) return

          startDeleteStaffTransition(async () => {
            const result = await deleteStaffMember(kitchen.id, deleteStaffTarget.id)
            if (result instanceof Error) {
              setDeleteStaffError(result.message)
              return
            }

            queryClient.invalidateQueries({ queryKey: STAFF_MEMBERS_QUERY_KEY })
            queryClient.invalidateQueries({ queryKey: ['staff-filter-members', kitchen.id] })
            queryClient.invalidateQueries({ queryKey: ['staff-members-picker', kitchen.id] })
            setDeleteStaffTarget(null)
            setDeleteStaffError(null)
          })
        }}
        isLoading={deleteStaffPending}
      />

      <DataTableDeleteDialog
        open={deleteShiftTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteShiftTarget(null)
            setDeleteShiftError(null)
          }
        }}
        description={
          deleteShiftError
            ? `Deleting a shift will also remove its assignments. ${deleteShiftError}`
            : 'Deleting a shift will also remove its assignments.'
        }
        onConfirm={() => {
          if (!deleteShiftTarget) return

          startDeleteShiftTransition(async () => {
            const result = await deleteWorkShift(kitchen.id, deleteShiftTarget.id)
            if (result instanceof Error) {
              setDeleteShiftError(result.message)
              return
            }

            queryClient.invalidateQueries({ queryKey: WORK_SHIFTS_QUERY_KEY })
            queryClient.invalidateQueries({ queryKey: SHIFT_ASSIGNMENTS_QUERY_KEY })
            queryClient.invalidateQueries({ queryKey: ['work-shifts-picker', kitchen.id] })
            setDeleteShiftTarget(null)
            setDeleteShiftError(null)
          })
        }}
        isLoading={deleteShiftPending}
      />

      <DataTableDeleteDialog
        open={deleteAssignmentTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteAssignmentTarget(null)
            setDeleteAssignmentError(null)
          }
        }}
        description={
          deleteAssignmentError
            ? `This will unassign the selected staff member from the shift. ${deleteAssignmentError}`
            : 'This will unassign the selected staff member from the shift.'
        }
        onConfirm={() => {
          if (!deleteAssignmentTarget) return

          startDeleteAssignmentTransition(async () => {
            const result = await deleteShiftAssignment(kitchen.id, deleteAssignmentTarget.id)
            if (result instanceof Error) {
              setDeleteAssignmentError(result.message)
              return
            }

            queryClient.invalidateQueries({ queryKey: SHIFT_ASSIGNMENTS_QUERY_KEY })
            setDeleteAssignmentTarget(null)
            setDeleteAssignmentError(null)
          })
        }}
        isLoading={deleteAssignmentPending}
      />
    </>
  )
}
