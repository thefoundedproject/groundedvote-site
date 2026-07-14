// © 2025 The Founded Project LLC — All rights reserved.
// app/api/research/snapshot/route.js
//
// POST { period? } — persist ResearchSnapshot rows for every geography
// passing the cohort floor. Idempotent per (geography, period).
// Headers: Authorization: Bearer <ADMIN_SECRET>

import { NextResponse } from 'next/server'
import { generateSnapshots, currentPeriod } from '@/lib/research'

export const dynamic = 'force-dynamic'

function isAuthorized(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { period } = await request.json().catch(() => ({}))
    const result = await generateSnapshots(period ?? currentPeriod())
    return NextResponse.json(result)
  } catch (err) {
    console.error('[research] snapshot error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
