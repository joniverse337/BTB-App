'use client'

import { PaperEngine } from '@/components/paper-engine'
import { ShiftCard } from '@/components/shift-card'
import { EmptySlot } from '@/components/empty-slot'
import { toDateString } from '@/lib/kw-utils'
import type { ShiftWithDetails } from '@/lib/validations/shift'
import type { Project } from '@/lib/validations/project'

const CARD_W = 794  // 210mm at 96dpi
const CARD_H = 1122 // 297mm at 96dpi

interface ShiftGridProps {
  days: Date[]
  shifts: ShiftWithDetails[]
  zoom: number
  project: Project | null
  logo?: { url: string; x: number; y: number; size: number } | null
  weatherLocation?: { lat: number; lon: number } | { address: string } | null
  workerCategories?: string[]
  equipmentCategories?: string[]
  onCreateShift: (datum: string, typ: 'tag' | 'nacht') => void
  onCopyPreviousDay: (datum: string, typ: 'tag' | 'nacht') => void
  onUpdateShift: (shiftId: string, field: string, value: string | number | null) => void
  onDeleteShift: (shift: ShiftWithDetails) => void
  onAddWorker: (shiftId: string, beruf: string) => void
  onUpdateWorker: (workerId: string, field: string, value: string | number) => void
  onDeleteWorker: (workerId: string) => void
  onAddEquipment: (shiftId: string, typ: string) => void
  onUpdateEquipment: (equipmentId: string, field: string, value: string | number) => void
  onDeleteEquipment: (equipmentId: string) => void
  onPrintShift: (shift: ShiftWithDetails, date: Date) => void
}

export function ShiftGrid({
  days, shifts, zoom, project, logo, weatherLocation, workerCategories, equipmentCategories,
  onCreateShift, onCopyPreviousDay, onUpdateShift, onDeleteShift,
  onAddWorker, onUpdateWorker, onDeleteWorker,
  onAddEquipment, onUpdateEquipment, onDeleteEquipment,
  onPrintShift,
}: ShiftGridProps) {
  const scale = zoom / 100
  const cardW = Math.round(CARD_W * scale)
  const cardH = Math.round(CARD_H * scale)

  const getShift = (date: Date, typ: 'tag' | 'nacht') => {
    const dateStr = toDateString(date)
    return shifts.find(s => s.datum === dateStr && s.typ === typ)
  }

  if (days.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#7a85a8', textAlign: 'center', gap: '12px' }}>
        <div style={{ fontSize: '40px' }}>Keine Tage in dieser Kalenderwoche.</div>
      </div>
    )
  }

  const renderSlot = (day: Date, typ: 'tag' | 'nacht') => {
    const dateStr = toDateString(day)
    const shift = getShift(day, typ)
    return (
      <div key={`${typ}-${dateStr}`} data-shift-id={shift?.id} style={{ width: cardW, height: cardH, overflow: shift ? 'hidden' : 'visible', flexShrink: 0 }}>
        {shift ? (
          <PaperEngine
            orientation="portrait"
            zoom={zoom}
            transformOrigin="top left"
            onPrint={() => onPrintShift(shift, day)}
            onDelete={() => onDeleteShift(shift)}
          >
            <ShiftCard
              shift={shift} date={day} project={project} logo={logo}
              weatherLocation={weatherLocation}
              workerCategories={workerCategories} equipmentCategories={equipmentCategories}
              onUpdateShift={onUpdateShift} onAddWorker={onAddWorker} onUpdateWorker={onUpdateWorker}
              onDeleteWorker={onDeleteWorker} onAddEquipment={onAddEquipment}
              onUpdateEquipment={onUpdateEquipment} onDeleteEquipment={onDeleteEquipment}
            />
          </PaperEngine>
        ) : (
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <EmptySlot date={day} typ={typ}
              onCreateEmpty={() => onCreateShift(dateStr, typ)}
              onCopyPrevious={() => onCopyPreviousDay(dateStr, typ)}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${days.length}, ${cardW}px)`,
      gap: '12px',
    }}>
      {days.map(day => renderSlot(day, 'tag'))}
      {days.map(day => renderSlot(day, 'nacht'))}
    </div>
  )
}
