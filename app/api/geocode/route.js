// © 2025 The Founded Project LLC — All rights reserved.
// app/api/geocode/route.js
//
// Address → state + congressional district + OCD division IDs.
// Census resolves the state and district (free, no key). Google Civic's
// divisionsByAddress adds OCD identifiers (state legislative districts,
// county, place) that state/local matching will use as coverage grows.
// Privacy: the address is forwarded to those two services for resolution
// and never stored — the response carries only district-level geography.

import { NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

async function censusLookup(address) {
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json&layers=all`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  const data = await res.json()
  const match = data?.result?.addressMatches?.[0]
  if (!match) return null

  const geos = match.geographies ?? {}
  // The congressional-district layer name carries the Congress number
  // ("119th Congressional Districts"); find it without pinning the number.
  const cdKey = Object.keys(geos).find(k => /Congressional Districts/i.test(k))
  const cdRaw = cdKey ? geos[cdKey]?.[0]?.CD119 ?? geos[cdKey]?.[0]?.CD ?? null : null
  // "01" → "1"; at-large districts ("00" / "98") → null (statewide)
  const district = cdRaw && !['00', '98'].includes(cdRaw) ? String(Number(cdRaw)) : null

  return {
    stateCode: geos.States?.[0]?.STUSAB ?? match.addressComponents?.state ?? null,
    stateName: geos.States?.[0]?.NAME ?? null,
    district,
    matchedAddress: match.matchedAddress,
    coordinates: match.coordinates,
  }
}

async function civicDivisions(address) {
  const key = process.env.GOOGLE_CIVIC_API_KEY
  if (!key) return null
  try {
    const url = `https://www.googleapis.com/civicinfo/v2/divisionsByAddress?address=${encodeURIComponent(address)}&key=${key}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const ids = Object.keys(data?.divisions ?? {})
    if (!ids.length) return null
    const pick = re => ids.find(id => re.test(id)) ?? null
    return {
      ocdIds: ids,
      stateLower: pick(/sldl:/),   // state house district
      stateUpper: pick(/sldu:/),   // state senate district
      county: pick(/county:/),
      place: pick(/place:/),
    }
  } catch {
    return null // divisions are an enhancement, never a blocker
  }
}

export async function GET(req) {
  const limited = applyRateLimit(req, 'geocode', 30, 60) // 30/min per IP
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

  try {
    const [census, divisions] = await Promise.all([
      censusLookup(address.trim()),
      civicDivisions(address.trim()),
    ])
    if (!census?.stateCode) {
      return NextResponse.json({ error: 'No match found for that address.' }, { status: 404 })
    }
    return NextResponse.json({ ...census, divisions })
  } catch (err) {
    console.error('geocode error:', err)
    return NextResponse.json({ error: 'Geocoding service unavailable.' }, { status: 502 })
  }
}
