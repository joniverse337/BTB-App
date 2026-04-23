'use client'

import { useState, useRef } from 'react'
import type { ShiftWorker } from '@/lib/validations/shift'
import { ActionChipPopover } from './action-chip-popover'

export function WorkerRow({ worker, onUpdate, onDelete, categories }: {
  worker: ShiftWorker
  onUpdate: (id: string, field: string, value: string | number) => void
  onDelete: () => void
  categories: string[]
}) {
  const [localBeruf, setLocalBeruf] = useState<string | null>(null)
  const [localAnz, setLocalAnz] = useState<string | null>(null)
  const [localStd, setLocalStd] = useState<string | null>(null)
  const [showChips, setShowChips] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const tdInp: React.CSSProperties = {
    width: '100%', border: 'none', background: 'transparent',
    fontFamily: "var(--font-ibm-plex-sans), sans-serif", fontSize: '10pt', color: '#222',
    outline: 'none', padding: '1px 2px', borderBottom: '1px dashed #ddd',
  }

  return (
    <tr>
      <td data-no-print="true" style={{ padding: '2px 3px', borderBottom: '1px solid #eee', width: '22px', position: 'relative' }}>
        <div ref={wrapRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowChips(v => !v)} className="circle-btn-grey" style={{
            borderRadius: '50%', cursor: 'pointer',
            fontSize: '14px', width: '16px', height: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>+</button>
          {showChips && (
            <ActionChipPopover
              categories={categories}
              onAdd={(cat) => { onUpdate(worker.id, 'beruf', cat); setLocalBeruf(null) }}
              onClose={() => setShowChips(false)}
              wrapRef={wrapRef}
            />
          )}
        </div>
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee' }}>
        <input type="text" value={localBeruf ?? worker.beruf} onChange={e => setLocalBeruf(e.target.value)}
          onBlur={() => { if (localBeruf !== null) { onUpdate(worker.id, 'beruf', localBeruf); setLocalBeruf(null) } }}
          placeholder="Beruf / Name..." style={tdInp} />
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '42px' }}>
        <input type="number" value={localAnz ?? worker.anz.toString()} onChange={e => setLocalAnz(e.target.value)}
          onBlur={() => { if (localAnz !== null) { const v = parseInt(localAnz, 10); onUpdate(worker.id, 'anz', isNaN(v) ? 1 : v); setLocalAnz(null) } }}
          style={{ ...tdInp, width: '38px' }} />
      </td>
      <td style={{ padding: '2px 5px', borderBottom: '1px solid #eee', width: '50px' }}>
        <input type="number" step="0.5" value={localStd ?? worker.std.toString()} onChange={e => setLocalStd(e.target.value)}
          onBlur={() => { if (localStd !== null) { const v = parseFloat(localStd); onUpdate(worker.id, 'std', isNaN(v) ? 0 : v); setLocalStd(null) } }}
          style={{ ...tdInp, width: '46px' }} />
      </td>
      <td data-no-print="true" style={{ padding: '2px 3px', borderBottom: '1px solid #eee', width: '20px' }}>
        <button onClick={onDelete} className="circle-btn-red" style={{ borderRadius: '50%', cursor: 'pointer', fontSize: '13px', width: '16px', height: '16px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </td>
    </tr>
  )
}
