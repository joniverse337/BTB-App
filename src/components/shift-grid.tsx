'use client'

import { Printer, X } from 'lucide-react'
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
  aaShiftKeys?: Set<string>
  onCreateFromAA?: (datum: string, typ: 'tag' | 'nacht') => void
}

function Slot({
  children, cardW, cardH, scale, hasActions, onPrint, onDelete,
}: {
  children: React.ReactNode
  cardW: number
  cardH: number
  scale: number
  hasActions: boolean
  onPrint?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className="group"
      style={{ position: 'relative', width: `${cardW}px`, height: `${cardH}px` }}
    >
      {hasActions && (
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
          style={{
            position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, display: 'flex', gap: '6px',
          }}
        >
          {onPrint && (
            <button onClick={onPrint} title="Drucken" style={{
              background: 'rgba(23,28,40,.92)', border: '1px solid rgba(255,255,255,.12)',
              color: '#fff', borderRadius: '4px', width: '28px', height: '28px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Printer size={13} /></button>
          )}
          {onDelete && (
            <button onClick={onDelete} title="Löschen" style={{
              background: 'rgba(23,28,40,.92)', border: '1px solid rgba(255,255,255,.12)',
              color: '#ff8080', borderRadius: '4px', width: '28px', height: '28px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={13} strokeWidth={2.5} /></button>
          )}
        </div>
      )}
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: '210mm',
        height: '297mm',
      }}>
        {children}
      </div>
    </div>
  )
}

export function ShiftGrid({
  days, shifts, zoom, project, logo, workerCategories, equipmentCategories,
  onCreateShift, onCopyPreviousDay, onUpdateShift, onDeleteShift,
  onAddWorker, onUpdateWorker, onDeleteWorker,
  onAddEquipment, onUpdateEquipment, onDeleteEquipment,
  onPrintShift, aaShiftKeys, onCreateFromAA,
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

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${days.length}, ${cardW}px)`,
      gap: '12px',
    }}>
      {/* Row 1: Tag shifts */}
      {days.map(day => {
        const dateStr = toDateString(day)
        const shift = getShift(day, 'tag')
        return (
          <Slot key={`tag-${dateStr}`} cardW={cardW} cardH={cardH} scale={scale} hasActions={!!shift}
            onPrint={shift ? () => onPrintShift(shift, day) : undefined}
            onDelete={shift ? () => onDeleteShift(shift) : undefined}
          >
            {shift ? (
              <ShiftCard shift={shift} date={day} project={project} logo={logo}
                workerCategories={workerCategories} equipmentCategories={equipmentCategories}
                onUpdateShift={onUpdateShift} onAddWorker={onAddWorker} onUpdateWorker={onUpdateWorker}
                onDeleteWorker={onDeleteWorker} onAddEquipment={onAddEquipment}
                onUpdateEquipment={onUpdateEquipment} onDeleteEquipment={onDeleteEquipment}
              />
            ) : (
              <EmptySlot date={day} typ="tag"
                onCreateEmpty={() => onCreateShift(dateStr, 'tag')}
                onCopyPrevious={() => onCopyPreviousDay(dateStr, 'tag')}
                onCreateFromAA={onCreateFromAA && aaShiftKeys?.has(`${dateStr}:tag`) ? () => onCreateFromAA(dateStr, 'tag') : undefined}
              />
            )}
          </Slot>
        )
      })}
      {/* Row 2: Nacht shifts */}
      {days.map(day => {
        const dateStr = toDateString(day)
        const shift = getShift(day, 'nacht')
        return (
          <Slot key={`nacht-${dateStr}`} cardW={cardW} cardH={cardH} scale={scale} hasActions={!!shift}
            onPrint={shift ? () => onPrintShift(shift, day) : undefined}
            onDelete={shift ? () => onDeleteShift(shift) : undefined}
          >
            {shift ? (
              <ShiftCard shift={shift} date={day} project={project} logo={logo}
                workerCategories={workerCategories} equipmentCategories={equipmentCategories}
                onUpdateShift={onUpdateShift} onAddWorker={onAddWorker} onUpdateWorker={onUpdateWorker}
                onDeleteWorker={onDeleteWorker} onAddEquipment={onAddEquipment}
                onUpdateEquipment={onUpdateEquipment} onDeleteEquipment={onDeleteEquipment}
              />
            ) : (
              <EmptySlot date={day} typ="nacht"
                onCreateEmpty={() => onCreateShift(dateStr, 'nacht')}
                onCopyPrevious={() => onCopyPreviousDay(dateStr, 'nacht')}
                onCreateFromAA={onCreateFromAA && aaShiftKeys?.has(`${dateStr}:nacht`) ? () => onCreateFromAA(dateStr, 'nacht') : undefined}
              />
            )}
          </Slot>
        )
      })}
    </div>
  )
}
