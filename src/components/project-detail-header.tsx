'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Settings } from 'lucide-react'
import type { Project } from '@/lib/validations/project'

interface ProjectDetailHeaderProps {
  project: Project | null
  isLoading: boolean
}

export function ProjectDetailHeader({ project, isLoading }: ProjectDetailHeaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isOnAA = pathname?.includes('/arbeitsanmeldung')
  const isOnSettings = pathname?.includes('/einstellungen')
  const kwSuffix = searchParams.get('kw') ? `?kw=${searchParams.get('kw')}` : ''

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
        <Link href="/projekte" style={{ textDecoration: 'none', flexShrink: 0 }}>
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
              <Link
                href={`/projekte/${project.id}${kwSuffix}`}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '5px 12px', borderRadius: '6px', textDecoration: 'none',
                  border: !isOnAA && !isOnSettings ? '1px solid #e8c547' : '1px solid transparent',
                  color: !isOnAA && !isOnSettings ? '#e8c547' : '#8a90a8',
                  fontSize: '13px', fontWeight: 500,
                }}
              >
                Bautagesberichte
              </Link>
              <Link
                href={`/projekte/${project.id}/arbeitsanmeldung${kwSuffix}`}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '5px 12px', borderRadius: '6px', textDecoration: 'none',
                  border: isOnAA ? '1px solid #e8c547' : '1px solid transparent',
                  color: isOnAA ? '#e8c547' : '#8a90a8',
                  fontSize: '13px', fontWeight: 500,
                }}
              >
                Arbeitsanmeldung
              </Link>
            </div>
            <Link
              href={`/projekte/${project.id}/einstellungen?from=${isOnAA ? 'arbeitsanmeldung' : 'btb'}${kwSuffix ? '&' + kwSuffix.slice(1) : ''}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px', borderRadius: '6px',
                color: isOnSettings ? '#e8c547' : '#8a90a8', flexShrink: 0,
              }}
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
