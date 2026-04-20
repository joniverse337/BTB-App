import { csrfHeaders } from '@/hooks/use-csrf-token'
import { logger } from '@/lib/logger'
import type { WorkNotificationRow } from '@/lib/validations/work-notification'

export async function upsertWorkNotificationRow(row: WorkNotificationRow): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/work-notifications/upsert-row', {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ row }),
    })
    if (!res.ok) {
      logger.error('workNotifications.upsert', 'Zeile konnte nicht gespeichert werden')
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    logger.error('workNotifications.upsert', `Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    return { ok: false }
  }
}
