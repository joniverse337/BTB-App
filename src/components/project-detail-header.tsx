'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import type { Project } from '@/lib/validations/project'

interface ProjectDetailHeaderProps {
  project: Project | null
  isLoading: boolean
}

function NavTab({
  href,
  active,
  dimmed,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  href: string
  active: boolean
  dimmed: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  children: React.ReactNode
}) {
  const color = dimmed ? '#8a90a8' : '#e8c547'
  return (
    <Link
      href={href}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="flex items-center px-3 py-[5px] rounded-md text-[13px] font-medium no-underline transition-colors"
      style={{
        border: active ? `1px solid #e8c547` : '1px solid transparent',
        color,
      }}
    >
      {children}
    </Link>
  )
}

export function ProjectDetailHeader({ project, isLoading }: ProjectDetailHeaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isOnAA = pathname?.includes('/arbeitsanmeldung')
  const isOnSettings = pathname?.includes('/einstellungen')
  const isOnBTB = !isOnAA && !isOnSettings
  const kwSuffix = searchParams.get('kw') ? `?kw=${searchParams.get('kw')}` : ''

  const [hovered, setHovered] = useState<string | null>(null)

  // When hovering an inactive tab, dim the active one
  const anyInactiveHovered = hovered !== null && (
    (hovered === 'btb' && !isOnBTB) ||
    (hovered === 'aa' && !isOnAA)
  )

  return (
    <header style={{
      background: '#171c28',
      borderBottom: '1px solid #3a4258',
      position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '0 22px', height: '52px',
      }}>
        <Link href="/projekte" className="btb-logo-link" style={{ flexShrink: 0 }}>
          <span style={{
            fontFamily: "var(--font-inter), sans-serif", fontWeight: 800, fontSize: '20px',
            color: '#e8c547', letterSpacing: '-1px',
          }}>BTB</span>
        </Link>

        {isLoading ? (
          <div style={{ height: '20px', width: '180px', background: '#202839', borderRadius: '4px', flexShrink: 0 }} />
        ) : project ? (
          <>
            <div style={{
              fontFamily: "var(--font-inter), sans-serif", fontWeight: 700, fontSize: '18px',
              color: '#dde2f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, minWidth: 0,
            }}>
              {project.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <NavTab
                href={`/projekte/${project.id}${kwSuffix}`}
                active={isOnBTB}
                dimmed={isOnBTB ? anyInactiveHovered : hovered !== 'btb'}
                onMouseEnter={() => setHovered('btb')}
                onMouseLeave={() => setHovered(null)}
              >
                Bautagesberichte
              </NavTab>
              <NavTab
                href={`/projekte/${project.id}/arbeitsanmeldung${kwSuffix}`}
                active={isOnAA}
                dimmed={isOnAA ? anyInactiveHovered : hovered !== 'aa'}
                onMouseEnter={() => setHovered('aa')}
                onMouseLeave={() => setHovered(null)}
              >
                Arbeitsanmeldung
              </NavTab>
            </div>
            <Link
              href={`/projekte/${project.id}/einstellungen?from=${isOnAA ? 'arbeitsanmeldung' : 'btb'}${kwSuffix ? '&' + kwSuffix.slice(1) : ''}`}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0 ${isOnSettings ? 'text-[#e8c547]' : 'text-[#8a90a8] hover:text-[#e8c547]'}`}
              aria-label="Projekteinstellungen"
              title="Projekteinstellungen"
            >
              <Settings size={18} />
            </Link>
          </>
        ) : null}
      </div>
    </header>
  )
}
