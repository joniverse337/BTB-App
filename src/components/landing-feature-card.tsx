import { LucideIcon } from 'lucide-react'

interface LandingFeatureCardProps {
  weekday: string
  date: string
  icon: LucideIcon
  title: string
  description: string
}

// A4 = 794×1122px, scaled to 35%
const CARD_W = Math.round(794 * 0.35)   // 278px
const CARD_H = Math.round(1122 * 0.35)  // 393px

export function LandingFeatureCard({ weekday, date, icon: Icon, title, description }: LandingFeatureCardProps) {
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        flexShrink: 0,
        border: '2px dashed rgba(232,197,71,0.35)',
        borderRadius: 8,
        background: 'rgba(232,197,71,0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '24px 20px',
        scrollSnapAlign: 'start',
      }}
    >
      {/* Date badge */}
      <div style={{ alignSelf: 'flex-start', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {weekday}, {date}
      </div>

      {/* Icon */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'rgba(232,197,71,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(232,197,71,0.25)',
      }}>
        <Icon size={24} style={{ color: '#e8c547' }} />
      </div>

      {/* Title */}
      <div style={{ color: 'rgba(255,255,255,0.90)', fontSize: 14, fontWeight: 700, textAlign: 'center', lineHeight: 1.35 }}>
        {title}
      </div>

      {/* Description */}
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
        {description}
      </div>
    </div>
  )
}
