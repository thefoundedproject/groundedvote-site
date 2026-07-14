// © 2025 The Founded Project LLC — All rights reserved.
// app/api/research/aggregate/route.js
//
// Public research aggregates for academic and journalism partners.
//   GET /api/research/aggregate?geography=MN&period=2026-Q3
//   GET /api/research/aggregate?geography=US&period=2026-Q3&format=csv
//
// Aggregate-only: cohorts under 50 return { suppressed: true }.
// Computed live; identical data is snapshotted weekly to ResearchSnapshot.

import { NextResponse } from 'next/server'
import { computeAggregate, currentPeriod, toCsv } from '@/lib/research'
import { applyRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const limited = applyRateLimit(request, 'research-aggregate', 20, 60)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const geography = (searchParams.get('geography') ?? 'US').toUpperCase()
  const period = searchParams.get('period') ?? currentPeriod()
  const format = searchParams.get('format') ?? 'json'

  if (!/^(US|[A-Z]{2})$/.test(geography)) {
    return NextResponse.json({ error: 'geography must be US or a two-letter state code' }, { status: 400 })
  }

  try {
    const agg = await computeAggregate(geography, period)
    if (format === 'csv') {
      return new NextResponse(toCsv(agg), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="groundedvote-${geography}-${period}.csv"`,
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      })
    }
    return NextResponse.json(agg, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
