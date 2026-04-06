'use client'
import { useState, useEffect } from 'react'

interface WeatherData {
  temp: number
  feelsLike: number
  humidity: number
  windspeed: number
  code: number
  city: string
}

// WMO weather interpretation codes → label + emoji
function interpret(code: number): { label: string; emoji: string } {
  if (code === 0)              return { label: 'Clear sky',       emoji: '☀️' }
  if (code <= 2)               return { label: 'Partly cloudy',   emoji: '⛅' }
  if (code === 3)              return { label: 'Overcast',        emoji: '☁️' }
  if (code <= 49)              return { label: 'Foggy',           emoji: '🌫️' }
  if (code <= 57)              return { label: 'Drizzle',         emoji: '🌦️' }
  if (code <= 67)              return { label: 'Rain',            emoji: '🌧️' }
  if (code <= 77)              return { label: 'Snow',            emoji: '❄️' }
  if (code <= 82)              return { label: 'Rain showers',    emoji: '🌧️' }
  if (code <= 86)              return { label: 'Snow showers',    emoji: '🌨️' }
  if (code <= 99)              return { label: 'Thunderstorm',    emoji: '⛈️' }
  return { label: 'Unknown', emoji: '🌡️' }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
    const d = await r.json()
    return d.address?.city || d.address?.town || d.address?.village || d.address?.county || 'Your location'
  } catch {
    return 'Your location'
  }
}

export default function WeatherWidget() {
  const [data, setData]     = useState<WeatherData | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load(lat: number, lon: number) {
      try {
        const [weatherRes, city] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relativehumidity_2m,weathercode,windspeed_10m&timezone=auto`),
          reverseGeocode(lat, lon),
        ])
        const json = await weatherRes.json()
        const c = json.current
        setData({
          temp:       Math.round(c.temperature_2m),
          feelsLike:  Math.round(c.apparent_temperature),
          humidity:   c.relativehumidity_2m,
          windspeed:  Math.round(c.windspeed_10m),
          code:       c.weathercode,
          city,
        })
      } catch {
        setError('Could not load weather.')
      } finally {
        setLoading(false)
      }
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported.')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => load(pos.coords.latitude, pos.coords.longitude),
      ()  => { setError('Location access denied.'); setLoading(false) },
      { timeout: 8000 }
    )
  }, [])

  if (loading) return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-3)' }}>Weather</p>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-3)' }}>Weather</p>
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>{error ?? 'Unavailable'}</p>
    </div>
  )

  const { label, emoji } = interpret(data.code)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>Weather</p>
        <p className="text-xs truncate max-w-[120px]" style={{ color: 'var(--text-3)' }}>{data.city}</p>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span style={{ fontSize: 44, lineHeight: 1 }}>{emoji}</span>
        <div>
          <p className="font-bold leading-none" style={{ fontSize: 36, color: 'var(--text-1)' }}>
            {data.temp}°
          </p>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>{label}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-auto">
        {[
          { label: 'Feels like', value: `${data.feelsLike}°` },
          { label: 'Humidity',   value: `${data.humidity}%` },
          { label: 'Wind',       value: `${data.windspeed} km/h` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg p-2 text-center" style={{ background: 'var(--input-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-1)' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
