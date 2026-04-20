import { csrfHeaders } from '@/hooks/use-csrf-token'
import { logger } from '@/lib/logger'
import type {
  UpdateShiftInput,
  UpdateShiftWorkerInput,
  UpdateShiftEquipmentInput,
} from '@/lib/validations/shift-update'

interface StdSync {
  workerIds: string[]
  equipmentIds: string[]
  value: number
}

export async function updateShiftField(
  shiftId: string,
  fields: UpdateShiftInput,
  stdSync?: StdSync
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/shifts/update-field', {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        id: shiftId,
        fields,
        ...(stdSync && {
          syncStdWorkerIds: stdSync.workerIds,
          syncStdEquipmentIds: stdSync.equipmentIds,
          syncStdValue: stdSync.value,
        }),
      }),
    })
    if (!res.ok) {
      logger.error('shifts.updateField', 'Schicht konnte nicht aktualisiert werden')
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    logger.error('shifts.updateField', `Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    return { ok: false }
  }
}

export async function updateShiftWorker(
  workerId: string,
  fields: UpdateShiftWorkerInput
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/shifts/update-worker', {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id: workerId, fields }),
    })
    if (!res.ok) {
      logger.error('shifts.updateWorker', 'Mitarbeiter konnte nicht aktualisiert werden')
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    logger.error('shifts.updateWorker', `Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    return { ok: false }
  }
}

export async function updateShiftEquipment(
  equipmentId: string,
  fields: UpdateShiftEquipmentInput
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/shifts/update-shift-equipment', {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id: equipmentId, fields }),
    })
    if (!res.ok) {
      logger.error('shifts.updateEquipment', 'Gerät konnte nicht aktualisiert werden')
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    logger.error('shifts.updateEquipment', `Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    return { ok: false }
  }
}
