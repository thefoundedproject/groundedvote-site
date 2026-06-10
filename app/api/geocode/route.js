import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/rate-limit'

export async function GET(req) {
  const limited = applyRateLimit(req, 'geocode', 30, 60) // 30/min per IP
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

  try {
    const encoded = encodeURIComponent(address.trim())
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encoded}&benchmark=Public_AR_Current&vintage=Current_Current&format=json&layers=10`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()

    const match = data?.result?.addressMatches?.[0]
    if (!match) return NextResponse.json({ error: 'No match found for that address.' }, { status: 404 })

    const stateCode = match.geographies?.States?.[0]?.STUSAB ?? match.addressComponents?.state
    const stateName = match.geographies?.States?.[0]?.NAME ?? null

    return NextResponse.json({
      stateCode,
      stateName,
      matchedAddress: match.matchedAddress,
      coordinates: match.coordinates,
    })
  } catch (err) {
    console.error('geocode error:', err)
    return NextResponse.json({ error: 'Geocoding service unavailable.' }, { status: 502 })
  }
}
