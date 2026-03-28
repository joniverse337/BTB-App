'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BtbDemoCard } from '@/components/btb-demo-card'
import { ChevronLeft, ChevronRight, FileText, Cloud, Printer, ClipboardList, Users, Wrench, CloudSun, FolderOpen, CalendarDays, Lock, Database, ShieldCheck, Globe } from 'lucide-react'

// ── Hero images ─────────────────────────────────────────────────────────────

const HERO_IMAGES = [
  '/images/hero-1.jpg',
  '/images/hero-2.jpg',
  '/images/hero-3.jpg',
  '/images/hero-4.jpg',
  '/images/hero-5.jpg',
]

const AUTOPLAY_INTERVAL = 6000

// ── Easing ───────────────────────────────────────────────────────────────────

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  // ── Carousel ──────────────────────────────────────────────────────────────
  const [currentImage, setCurrentImage] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const imageCount = HERO_IMAGES.length

  const startAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % imageCount)
    }, AUTOPLAY_INTERVAL)
  }, [imageCount])

  useEffect(() => {
    if (!isPaused && imageCount > 1) startAutoplay()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPaused, startAutoplay, imageCount])

  const goTo = useCallback((index: number) => {
    setCurrentImage(index)
    if (!isPaused && imageCount > 1) startAutoplay()
  }, [isPaused, startAutoplay, imageCount])

  const goPrev = useCallback(() => goTo((currentImage - 1 + imageCount) % imageCount), [currentImage, imageCount, goTo])
  const goNext = useCallback(() => goTo((currentImage + 1) % imageCount), [currentImage, imageCount, goTo])

  // ── Morphing logo — kein React-State, direkte DOM-Updates ────────────────
  const heroLogoRef  = useRef<HTMLDivElement>(null)
  const headerLogoRef   = useRef<HTMLDivElement>(null)
  const fixedLogoRef    = useRef<HTMLDivElement>(null)
  const fixedLogoDarkRef = useRef<HTMLDivElement>(null)
  const headerElRef     = useRef<HTMLElement>(null)
  const subtitleRef     = useRef<HTMLParagraphElement>(null)
  const logoBoxRef      = useRef<HTMLDivElement>(null)
  const heroSectionRef     = useRef<HTMLElement>(null)
  const lightSectionRef    = useRef<HTMLElement>(null)
  const securitySectionRef = useRef<HTMLElement>(null)
  const rectsRef = useRef<{
    heroX: number; heroY: number; heroH: number; heroW: number
    hdrX: number; hdrY: number; hdrH: number; heroSectionH: number
    lightRanges: Array<{ s: number; e: number }>
  }>({ heroX: 0, heroY: 0, heroH: 0, heroW: 0, hdrX: 0, hdrY: 0, hdrH: 0, heroSectionH: 0, lightRanges: [] })
  const [logoReady, setLogoReady] = useState(false)

  // Positionen einmalig messen (+ bei Resize wiederholen)
  useLayoutEffect(() => {
    const measure = () => {
      if (!heroLogoRef.current || !headerLogoRef.current) return
      const sv = window.scrollY
      if (sv > 0) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      const hr  = heroLogoRef.current.getBoundingClientRect()
      const hdr = headerLogoRef.current.getBoundingClientRect()
      if (sv > 0) window.scrollTo({ top: sv, behavior: 'instant' as ScrollBehavior })
      const heroSectionH = heroSectionRef.current ? heroSectionRef.current.offsetHeight : window.innerHeight
      // Collect all light-background sections as document-Y ranges
      const lightRanges = ([lightSectionRef, securitySectionRef] as const)
        .filter(r => r.current)
        .map(r => {
          const rect = r.current!.getBoundingClientRect()
          return { s: rect.top + sv, e: rect.bottom + sv }
        })
      rectsRef.current = { heroX: hr.left, heroY: hr.top, heroH: hr.height, heroW: hr.width, hdrX: hdr.left, hdrY: hdr.top, hdrH: hdr.height, heroSectionH, lightRanges }
      setLogoReady(true)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyLogoTransform = useCallback((sy: number) => {
    const { heroX, heroY, heroH, heroW, hdrY, hdrH, lightRanges } = rectsRef.current
    if (!heroH || !fixedLogoRef.current || !headerElRef.current) return
    fixedLogoRef.current.style.visibility = 'visible'
    const ANIM_ZONE = 120
    const FADE_EXTRA = 60           // text & box finish this many px after logo lands
    const triggerY  = heroY - hdrY - 50
    const rawP = Math.max(0, Math.min(1, (sy - triggerY) / ANIM_ZONE))
    const p    = easeInOut(rawP)
    const scale = 1 + (hdrH / heroH - 1) * p
    const x = heroX + (heroW * (1 - scale)) / 2
    const y = (heroY - sy) + (hdrY - (heroY - sy)) * p
    const transform = `translate(${x}px, ${y}px) scale(${scale})`
    fixedLogoRef.current.style.transform = transform
    const bg  = `hsla(222,25%,9%,${0.75 + 0.2 * p})`
    const brd = `1px solid hsla(222,15%,100%,${0.04 + 0.03 * p})`
    headerElRef.current.style.background   = bg
    headerElRef.current.style.borderBottom = brd
    // subtitle fades slightly after logo lands
    const textRawP = Math.max(0, Math.min(1, (sy - triggerY) / (ANIM_ZONE + FADE_EXTRA)))
    if (subtitleRef.current) subtitleRef.current.style.opacity = String(1 - easeInOut(textRawP))
    if (logoBoxRef.current) {
      const BOX_FADE_EXTRA = 140
      const boxRawP = Math.max(0, Math.min(1, (sy - (triggerY - BOX_FADE_EXTRA)) / (ANIM_ZONE + BOX_FADE_EXTRA + FADE_EXTRA)))
      logoBoxRef.current.style.opacity = String(1 - easeInOut(boxRawP))
    }
    // ── Logo color split: white over dark, black over any light section ──
    // Find the first light range that overlaps the logo
    const s2h        = hdrH > 0 ? heroH / hdrH : 1
    const logoDocTop = sy + hdrY
    let activeEntry = hdrH  // sentinel = no light range active
    let activeExit  = 0
    for (const range of lightRanges) {
      const rawE = range.s - logoDocTop
      const rawX = range.e - logoDocTop
      if (rawX > 0 && rawE < hdrH) {
        activeEntry = Math.max(0, Math.min(hdrH, rawE))
        activeExit  = Math.max(0, Math.min(hdrH, rawX))
        break
      }
    }
    const entryL = activeEntry * s2h
    const exitL  = activeExit  * s2h
    let whiteClip: string
    let darkClip:  string
    if (activeExit <= 0 || activeEntry >= hdrH) {
      whiteClip = 'none'; darkClip = `inset(${heroH}px -40px 0 -40px)`
    } else if (activeEntry <= 0 && activeExit >= hdrH) {
      whiteClip = `inset(0 -40px ${heroH}px -40px)`; darkClip = 'none'
    } else if (activeExit >= hdrH) {
      whiteClip = `inset(0 -40px ${heroH - entryL}px -40px)`
      darkClip  = `inset(${entryL}px -40px 0 -40px)`
    } else {
      whiteClip = `inset(${exitL}px -40px 0 -40px)`
      darkClip  = `inset(0 -40px ${heroH - exitL}px -40px)`
    }
    fixedLogoRef.current.style.clipPath = whiteClip
    if (fixedLogoDarkRef.current) {
      fixedLogoDarkRef.current.style.visibility = 'visible'
      fixedLogoDarkRef.current.style.transform  = transform
      fixedLogoDarkRef.current.style.clipPath   = darkClip
    }
  }, [])

  // Nach dem ersten Render mit logoReady=true ist fixedLogoRef gemountet → Position setzen
  useEffect(() => {
    if (logoReady) applyLogoTransform(window.scrollY)
  }, [logoReady, applyLogoTransform])

  // Scroll-Handler — kein setState, kein Re-render
  useEffect(() => {
    let rafId: number
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => applyLogoTransform(window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId) }
  }, [applyLogoTransform])

  return (
    <div className="min-h-screen text-foreground">

      {/* ── Morphing logos (fixed, above everything) ────────────────────── */}
      {logoReady && (() => {
        const sharedStyle: React.CSSProperties = {
          position: 'fixed',
          left: 0,
          top: 0,
          transformOrigin: 'top left',
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: 'clamp(2.2rem, 5vw, 4rem)',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.025em',
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.05em',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          visibility: 'hidden',
        }
        return (
          <>
            {/* White version — visible over dark hero */}
            <div ref={fixedLogoRef} aria-hidden style={{ ...sharedStyle, zIndex: 61 }}>
              <span style={{ color: '#ffffff' }}>btb</span>
              <span style={{ color: '#e8c547', fontWeight: 700 }}>.online</span>
            </div>
            {/* Dark version — visible over light section, clipped from top */}
            <div ref={fixedLogoDarkRef} aria-hidden style={{ ...sharedStyle, zIndex: 61 }}>
              <span style={{ color: '#0e1118' }}>btb</span>
              <span style={{ color: '#b8902a', fontWeight: 700 }}>.online</span>
            </div>
          </>
        )
      })()}

      {/* ── Sticky Navbar (left half only) ─────────────────────────────── */}
      <div className="fixed top-0 left-0 z-50">
        <header
          ref={headerElRef}
          className="flex items-center gap-6 px-4 py-2 sm:py-2.5"
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottomRightRadius: '0.75rem',
          }}
        >
          {/* Invisible placeholder — reserves layout space for morphing logo */}
          <div
            ref={headerLogoRef}
            aria-hidden
            style={{
              visibility: 'hidden',
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: '1.125rem',
              fontWeight: 800,
              lineHeight: 1.75,
              letterSpacing: '-0.025em',
              whiteSpace: 'nowrap',
            }}
          >
            btb.online
          </div>

          <nav className="flex items-center gap-6 pr-4" aria-label="Hauptnavigation">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Einloggen
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold rounded-md px-3 py-1.5 transition-opacity hover:opacity-85"
              style={{ background: '#e8c547', color: '#0e1118' }}
            >
              Kostenlos starten
            </Link>
          </nav>
        </header>
        {/* Right side: transparent, image shows through */}
        <div className="flex-1" />
      </div>

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section
        ref={heroSectionRef}
        className="relative flex min-h-screen flex-col"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Background images */}
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === currentImage ? 1 : 0 }}
            aria-hidden={i !== currentImage}
          >
            <Image
              src={src}
              alt={`Baustelle ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
              sizes="100vw"
            />
          </div>
        ))}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

        {/* Content grid */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-start gap-8 px-4 sm:px-6 lg:flex-row lg:items-start lg:gap-12 pt-4">

          {/* Left: logo placeholder + subtitle */}
          <div className="flex flex-col items-start lg:flex-1" style={{ paddingTop: '28vh' }}>
            <div ref={logoBoxRef} className="w-full max-w-md rounded-xl p-6 sm:p-8 lg:p-10 flex flex-col items-center" style={{ background: 'hsla(222,25%,9%,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid hsla(222,15%,100%,0.07)' }}>
              {/* Invisible hero logo placeholder — reserves space for the fixed logo */}
              <div
                ref={heroLogoRef}
                aria-hidden
                style={{
                  visibility: 'hidden',
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: 'clamp(2.2rem, 5vw, 4rem)',
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.025em',
                  whiteSpace: 'nowrap',
                }}
              >
                btb.online
              </div>

              {/* Subtitle — fades on scroll */}
              <p
                ref={subtitleRef}
                className="mt-3 text-base text-center leading-relaxed text-white/80 sm:mt-4 sm:text-lg"
              >
                Kein Papier. Kein Excel. Einfach digital.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3 w-full justify-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-bold transition-opacity hover:opacity-85"
                  style={{ background: '#e8c547', color: '#0e1118' }}
                >
                  Kostenlos starten
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  Einloggen
                </Link>
              </div>
            </div>
          </div>

          {/* Right: BTB Demo Card — mobile/tablet: centered below text, desktop: side by side */}
          {/* Mobile / tablet (< lg): show centered, smaller scale */}
          <div className="flex justify-center lg:hidden">
            <div
              style={{
                width: '320px',
                height: `${Math.round(1122 * (320 / 793))}px`,
                overflow: 'hidden',
                borderRadius: '6px',
                boxShadow: '0 0 0 2px #e8c547, 0 24px 80px -12px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ transform: `scale(${320 / 793})`, transformOrigin: 'top left', width: '210mm', height: '297mm' }}>
                <BtbDemoCard />
              </div>
            </div>
          </div>
          {/* Desktop (lg+): full-size side by side */}
          <div className="hidden lg:block lg:shrink-0" style={{ width: '430px', paddingTop: '5px' }}>
            <div
              style={{
                width: '430px',
                height: `${Math.round(1122 * (430 / 793))}px`,
                overflow: 'hidden',
                borderRadius: '6px',
                boxShadow: '0 0 0 2px #e8c547, 0 24px 80px -12px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ transform: `scale(${430 / 793})`, transformOrigin: 'top left', width: '210mm', height: '297mm' }}>
                <BtbDemoCard />
              </div>
            </div>
          </div>
        </div>

        {/* Carousel navigation */}
        {imageCount > 1 && (
          <div className="relative z-10 flex items-center gap-4 px-4 pb-6 sm:px-6 lg:pb-8">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-primary backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              {HERO_IMAGES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === currentImage ? 'bg-primary scale-125' : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Bild ${i + 1}`}
                  aria-current={i === currentImage ? 'true' : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-primary backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* ── Was ist btb.online? ──────────────────────────────────────────── */}
      <section ref={lightSectionRef} style={{ background: '#f2f1ec' }} className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">

          {/* Split: text left, image right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">

            {/* Text */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#b8902a', letterSpacing: '0.12em' }}>
                Das Portal für Bauleiter & Poliere
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-5" style={{ fontFamily: "var(--font-inter), sans-serif", color: '#0e1118', lineHeight: 1.15 }}>
                Schluss mit dem Zettelchaos.<br />Berichte digital in Minuten.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#4b5360' }}>
                Bauleiter und Poliere verlieren täglich wertvolle Zeit mit Papierformularen und Excel-Tabellen. btb.online ersetzt diesen Prozess: Trag deine Schicht direkt digital ein — strukturiert, sicher und druckfertig für den Auftraggeber.
              </p>
            </div>

            {/* Image */}
            <div
              style={{
                position: 'relative',
                height: '340px',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                border: '3px solid #e8c547',
              }}
            >
              <Image
                src="/images/hero-3.jpg"
                alt="Baustelle"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* 3 highlight tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {([
              { Icon: FileText, title: 'Digital statt Excel',       desc: 'Schluss mit leeren Feldern und Flüchtigkeitsfehlern. Die App führt dich Schritt für Schritt strukturiert durch jeden Bericht.' },
              { Icon: Cloud,    title: 'Immer verfügbar',           desc: 'Deine Berichte sind jederzeit abrufbar — auf der Baustelle, im Büro oder am Abend daheim.' },
              { Icon: Printer,  title: 'Druckfertig mit einem Klick', desc: 'Ein Klick genügt: Jeder BTB wird als sauberer DIN-A4-Bericht ausgegeben — druckfertig für Auftraggeber und Archiv.' },
            ] as const).map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-4 rounded-xl p-6 sm:p-8"
                style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(184,144,42,0.10)', border: '1px solid rgba(184,144,42,0.25)', flexShrink: 0 }}
                >
                  <Icon className="h-5 w-5" style={{ color: '#b8902a' }} />
                </div>
                <h3 className="font-bold" style={{ fontSize: '1.0625rem', color: '#0e1118' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features-Grid ───────────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-28 border-t border-white/[0.06]" style={{ background: '#0e1118' }}>
        {/* Blurred construction site photo as background texture */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          <Image
            src="/images/hero-2.jpg"
            alt=""
            fill
            className="object-cover"
            style={{ filter: 'blur(10px) brightness(0.50)', transform: 'scale(1.08)' }}
            sizes="100vw"
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,17,24,0.72)' }} />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">

          <div className="mx-auto max-w-xl text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#e8c547', letterSpacing: '0.12em' }}>
              Funktionen
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white" style={{ fontFamily: "var(--font-inter), sans-serif", lineHeight: 1.15 }}>
              Alles drin. Nichts zu viel.
            </h2>
            <p className="mt-4 text-white/55 text-base leading-relaxed">
              Entwickelt für den Alltag auf der Baustelle — ohne Schulung, ohne Einarbeitung.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {([
              { Icon: ClipboardList, title: 'Bautagesbericht erfassen',    desc: 'Tägliche BTBs anlegen — mit Örtlichkeit, ausgeführten Arbeiten, Vorkommnissen und Unterschrift.' },
              { Icon: Users,         title: 'Personal verwalten',          desc: 'Bauleiter, Poliere, Facharbeiter per Klick eintragen — Anzahl und Stunden werden sauber dokumentiert.' },
              { Icon: Wrench,        title: 'Geräte & Maschinen',          desc: 'Eingesetzte Maschinen direkt im Bericht erfassen. Eigene Gerätekategorien jederzeit ergänzbar.' },
              { Icon: CloudSun,      title: 'Wetter & Arbeitszeit',        desc: 'Temperatur, Witterung und Bodenzustand in Sekunden eingetragen. Nettostunden werden automatisch berechnet.' },
              { Icon: FolderOpen,    title: 'Projektverwaltung',           desc: 'Mehrere Bauprojekte parallel verwalten — jedes mit eigenem Auftraggeber, Kostenstelle und Zeitraum.' },
              { Icon: CalendarDays,  title: 'KW-Übersicht',               desc: 'Alle Schichten nach Kalenderwochen sortiert — kein Suchen mehr, immer sofortiger Überblick.' },
            ] as const).map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 rounded-xl p-5 sm:p-6 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.055)'; el.style.border = '1px solid rgba(232,197,71,0.3)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.025)'; el.style.border = '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(232,197,71,0.09)', border: '1px solid rgba(232,197,71,0.18)' }}
                >
                  <Icon className="h-[18px] w-[18px]" style={{ color: '#e8c547' }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-semibold text-white" style={{ fontSize: '0.9375rem' }}>{title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sicherheit & Zuverlässigkeit ────────────────────────────────── */}
      <section ref={securitySectionRef} style={{ background: '#f2f1ec' }} className="py-20 sm:py-28 border-t border-black/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-0">

          {/* Image — left-flush, rounded corners on right side visible, left clipped at viewport edge */}
          <div
            style={{
              position: 'relative',
              height: '420px',
              borderRadius: '0 1rem 1rem 0',
              overflow: 'hidden',
              border: '3px solid #e8c547',
              borderLeft: 'none',
              boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
            }}
          >
            <Image
              src="/images/security.JPG"
              alt="Datensicherheit"
              fill
              className="object-cover object-center"
              sizes="50vw"
            />
          </div>

          {/* Text + Cards — right side with padding */}
          <div className="px-8 sm:px-12 lg:px-16">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#b8902a', letterSpacing: '0.12em' }}>
                Sicherheit
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ fontFamily: "var(--font-inter), sans-serif", color: '#0e1118', lineHeight: 1.15 }}>
                Deine Daten. Sicher.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed mb-8" style={{ color: '#4b5360' }}>
                btb.online setzt auf bewährte Cloud-Infrastruktur, damit deine Bautagesberichte jederzeit geschützt und verfügbar sind.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { Icon: Lock,        title: 'SSL-Verschlüsselung', desc: 'Alle Daten werden verschlüsselt übertragen. Deine Verbindung ist jederzeit gesichert.' },
                  { Icon: Database,    title: 'Automatische Backups', desc: 'Supabase sichert deine Daten automatisch und regelmäßig. Kein Datenverlust.' },
                  { Icon: ShieldCheck, title: 'Zugriffsschutz',      desc: 'Login-Pflicht und Row-Level Security: nur du siehst deine Projekte.' },
                  { Icon: Globe,       title: 'DSGVO-konform',       desc: 'Datenhaltung auf EU-Servern. Konform mit der Datenschutz-Grundverordnung.' },
                ] as const).map(({ Icon, title, desc }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-xl p-4"
                    style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(184,144,42,0.10)', border: '1px solid rgba(184,144,42,0.25)' }}
                    >
                      <Icon className="h-[16px] w-[16px]" style={{ color: '#b8902a' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ fontSize: '0.875rem', color: '#0e1118' }}>{title}</h3>
                      <p className="leading-relaxed" style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ background: '#0e1118' }} className="py-24 sm:py-32 border-t border-white/[0.06]">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "var(--font-inter), sans-serif", lineHeight: 1.2 }}>
            Starte heute.<br />Erster BTB in unter 2 Minuten.
          </h2>
          <p className="text-white/55 text-base sm:text-lg mb-10 leading-relaxed">
            Kostenlos registrieren — kein Vertrag, keine Kreditkarte.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-85"
              style={{ background: '#e8c547', color: '#0e1118' }}
            >
              Jetzt kostenlos starten
            </Link>
            <p className="text-white/35 text-sm">Kein Risiko. Jederzeit kündbar.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.07] bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-baseline gap-0.5" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              <span className="font-extrabold text-foreground">btb</span>
              <span className="font-bold text-primary">.online</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground" aria-label="Footer-Navigation">
              <Link href="/impressum" className="transition-colors hover:text-foreground">Impressum</Link>
              <Link href="/datenschutz" className="transition-colors hover:text-foreground">Datenschutz</Link>
            </nav>
            <p className="text-xs text-muted-foreground">&copy; 2026 BTB.online</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
