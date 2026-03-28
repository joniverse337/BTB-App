'use client'

interface EmptySlotProps {
  date: Date
  typ: 'tag' | 'nacht'
  onCreateEmpty: () => void
  onCopyPrevious: () => void
}

const WT = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

export function EmptySlot({ date, typ, onCreateEmpty, onCopyPrevious }: EmptySlotProps) {
  const isTag = typ === 'tag'
  const wt = WT[date.getDay()]
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`

  const btnBg = isTag ? 'rgba(232,197,71,.15)' : 'rgba(74,124,247,.15)'
  const btnColor = isTag ? '#e8c547' : '#4a7cf7'
  const btnBorder = isTag ? 'rgba(232,197,71,.3)' : 'rgba(74,124,247,.3)'

  return (
    <div style={{
      width: '210mm', height: '297mm',
      background: isTag ? 'rgba(232,197,71,.07)' : 'rgba(74,124,247,.07)',
      border: `2px dashed ${isTag ? 'rgba(232,197,71,.5)' : 'rgba(74,124,247,.5)'}`,
      borderRadius: '6px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '12px', padding: '30px', textAlign: 'center', color: '#7a85a8',
    }}>
      <div style={{ fontSize: '48px', opacity: 0.5 }}>{isTag ? '\u2600\uFE0F' : '\uD83C\uDF19'}</div>
      <div style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 700, fontSize: '26pt', color: '#dde2f0', opacity: 0.7 }}>{wt}</div>
      <div style={{ fontSize: '18pt', color: '#7a85a8', marginTop: '-4px' }}>{dateStr}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px', marginTop: '8px' }}>
        <button onClick={onCreateEmpty} style={{
          padding: '16px 40px', borderRadius: '10px',
          border: `1px solid ${btnBorder}`, background: btnBg, color: btnColor,
          fontSize: '24px', fontWeight: 600, fontFamily: "var(--font-ibm-plex-sans), sans-serif", cursor: 'pointer',
        }}>
          {isTag ? 'Tagschicht anlegen' : 'Nachtschicht anlegen'}
        </button>
        <button onClick={onCopyPrevious} style={{
          padding: '16px 40px', borderRadius: '10px',
          border: '1px solid #2b3454', background: 'rgba(255,255,255,.05)', color: '#7a85a8',
          fontSize: '24px', fontWeight: 600, fontFamily: "var(--font-ibm-plex-sans), sans-serif", cursor: 'pointer',
        }}>
          Vortag übernehmen
        </button>
      </div>
    </div>
  )
}
