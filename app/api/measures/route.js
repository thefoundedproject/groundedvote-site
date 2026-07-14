// © 2025 The Founded Project LLC — All rights reserved.
// app/api/measures/route.js
//
// GET /api/measures?state=AZ — statewide ballot measures for display
// alongside races. Public, cached; static-ish data.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const limited = applyRateLimit(request, 'measures', 30, 60)
  if (limited) return limited

  const state = (new URL(request.url).searchParams.get('state') ?? '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(state)) {
    return NextResponse.json({ error: 'state (two-letter code) required' }, { status: 400 })
  }

  try {
    const measures = await prisma.ballotMeasure.findMany({
      where: { state, year: 2026 },
      orderBy: { title: 'asc' },
      select: {
        id: true, title: true, description: true,
        yesPosition: true, noPosition: true, sourceUrl: true,
      },
    })
    return NextResponse.json({ measures }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error('[measures] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
