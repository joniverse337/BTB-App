'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Project } from '@/lib/validations/project'
import type { ShiftWithDetails } from '@/lib/validations/shift'

interface ShiftContextValue {
  project: Project
  logo: { url: string; x: number; y: number; size: number } | null
  workerCategories: string[] | undefined
  equipmentCategories: string[] | undefined
  aaShiftKeys: Set<string>
  onCreateShift: (datum: string, typ: 'tag' | 'nacht') => Promise<void>
  onCopyPreviousDay: (datum: string, typ: 'tag' | 'nacht') => Promise<void>
  onUpdateShift: (shiftId: string, field: string, value: string | number | null) => Promise<void>
  onDeleteShift: (shift: ShiftWithDetails) => void
  onAddWorker: (shiftId: string, beruf: string) => Promise<void>
  onUpdateWorker: (workerId: string, field: string, value: string | number) => Promise<void>
  onDeleteWorker: (workerId: string) => Promise<void>
  onAddEquipment: (shiftId: string, typ: string) => Promise<void>
  onUpdateEquipment: (equipmentId: string, field: string, value: string | number) => Promise<void>
  onDeleteEquipment: (equipmentId: string) => Promise<void>
  onPrintShift: (shift: ShiftWithDetails, date: Date) => void
  onCreateFromAA: (datum: string, typ: 'tag' | 'nacht') => Promise<void>
}

const ShiftContext = createContext<ShiftContextValue | null>(null)

interface ShiftProviderProps extends ShiftContextValue {
  children: ReactNode
}

export function ShiftProvider({ children, ...value }: ShiftProviderProps) {
  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  )
}

export function useShiftContext(): ShiftContextValue {
  const ctx = useContext(ShiftContext)
  if (!ctx) {
    throw new Error('useShiftContext must be used within a ShiftProvider')
  }
  return ctx
}
