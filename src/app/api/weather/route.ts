import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedRoute } from '@/lib/api-utils'
import { logger } from '@/lib/logger'
import { WITTERUNG_OPTIONS } from '@/lib/validations/shift'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datumsformat (YYYY-MM-DD)')

// Entweder lat+lon ODER address — beides zusammen nicht erlaubt
const weatherQuerySchema = z.union([
  z.object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    address: z.undefined(),
    date: dateSchema,
  }),
  z.object({
    lat: z.undefined(),
    lon: z.undefined(),
    address: z.string().min(1).max(500),
    date: dateSchema,
  }),
])

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'BTB-App/1.0 (bautagesbericht)' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data) || !data.length) return null
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
}

// WMO weather code → Witterung option mapping (verwendet exakt die WITTERUNG_OPTIONS-Strings)
function mapWmoToWitterung(code: number): string {
  if (code === 0) return WITTERUNG_OPTIONS[0]  // Sonnig
  if (code <= 3)  return WITTERUNG_OPTIONS[1]  // Wechselhaft
  if (code <= 48) return WITTERUNG_OPTIONS[7]  // Nebel
  if (code <= 67) return WITTERUNG_OPTIONS[3]  // Regen
  if (code <= 77) return WITTERUNG_OPTIONS[4]  // Schnee
  if (code <= 82) return WITTERUNG_OPTIONS[3]  // Regen
  if (code <= 86) return WITTERUNG_OPTIONS[4]  // Schnee
  if (code <= 99) return WITTERUNG_OPTIONS[1]  // Wechselhaft
  return WITTERUNG_OPTIONS[1]
}

// Fix 3: createAuthenticatedRoute erzwingt eingeloggten Nutzer (401 sonst)
export const GET = createAuthenticatedRoute(async (request) => {
  const { searchParams } = new URL(request.url)

  const parsed = weatherQuerySchema.safeParse({
    lat: searchParams.get('lat') ?? undefined,
    lon: searchParams.get('lon') ?? undefined,
    address: searchParams.get('address') ?? undefined,
    date: searchParams.get('date'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Parameter.' },
      { status: 400 }
    )
  }

  const { date } = parsed.data

  const today = new Date().toISOString().slice(0, 10)

  if (date > today) {
    return NextResponse.json({ error: 'Zukunftsdaten nicht verfügbar' }, { status: 400 })
  }

  // Koordinaten auflösen — direkt oder via Geocoding
  let lat: number
  let lon: number
  if (parsed.data.address) {
    const coords = await geocode(parsed.data.address)
    if (!coords) {
      return NextResponse.json({ error: 'Adresse nicht gefunden' }, { status: 422 })
    }
    lat = coords.lat
    lon = coords.lon
  } else {
    lat = parsed.data.lat!
    lon = parsed.data.lon!
  }

  try {
    let temp: number
    let witterung: string

    if (date === today) {
      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', String(lat))
      url.searchParams.set('longitude', String(lon))
      url.searchParams.set('current', 'temperature_2m,weather_code')
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString(), { next: { revalidate: 300 } })
      if (!res.ok) throw new Error('Open-Meteo forecast Fehler')
      const data = await res.json()
      temp = Math.round(data.current.temperature_2m)
      witterung = mapWmoToWitterung(data.current.weather_code)
    } else {
      const url = new URL('https://archive-api.open-meteo.com/v1/archive')
      url.searchParams.set('latitude', String(lat))
      url.searchParams.set('longitude', String(lon))
      url.searchParams.set('start_date', date)
      url.searchParams.set('end_date', date)
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code')
      url.searchParams.set('timezone', 'auto')

      const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
      if (!res.ok) throw new Error('Open-Meteo archive Fehler')
      const data = await res.json()
      const max = data.daily.temperature_2m_max[0]
      const min = data.daily.temperature_2m_min[0]
      temp = Math.round((max + min) / 2)
      witterung = mapWmoToWitterung(data.daily.weather_code[0])
    }

    return NextResponse.json({ temp, witterung })
  } catch (err) {
    logger.error('weather.fetch', 'Wetterdaten konnten nicht abgerufen werden')
    return NextResponse.json({ error: 'Wetterdaten konnten nicht geladen werden' }, { status: 500 })
  }
})
