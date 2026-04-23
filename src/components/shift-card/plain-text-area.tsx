'use client'

import { useRef, useEffect } from 'react'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export function PlainTextArea({
  value,
  onBlur,
  placeholder,
  minHeight,
}: {
  value: string
  onBlur: (text: string) => void
  placeholder?: string
  minHeight: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const adjust = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el) {
      el.value = stripHtml(value)
    }
    adjust()
  }, [value])

  return (
    <textarea
      ref={ref}
      defaultValue={stripHtml(value)}
      placeholder={placeholder}
      onInput={adjust}
      onBlur={e => onBlur(e.target.value)}
      style={{
        width: '100%',
        border: '1px solid #e8e8e8',
        borderRadius: '3px',
        background: '#fafafa',
        fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        fontSize: '10pt',
        color: '#222',
        outline: 'none',
        padding: '4px 5px',
        minHeight,
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        resize: 'none',
        overflow: 'hidden',
      }}
    />
  )
}
