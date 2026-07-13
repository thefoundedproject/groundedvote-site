// © 2025 The Founded Project LLC — All rights reserved.
// app/api/admin/rhetoric/route.js
//
// POST { candidateId } — score one candidate's record vs. rhetoric
// POST { all: true }   — score every candidate with a bioguideId
// Headers: Authorization: Bearer <ADMIN_SECRET>

import { NextResponse } from 'next/server'
import { scoreAndSaveRhetoric, scoreAllIncumbents } from '@/lib/rhetoric'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isAuthorized(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { candidateId, all } = await request.json().catch(() => ({}))
    if (all) {
      const summary = await scoreAllIncumbents()
      return NextResponse.json(summary)
    }
    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId or all:true required' }, { status: 400 })
    }
    const result = await scoreAndSaveRhetoric(candidateId)
    return NextResponse.json(result ?? { skipped: true, reason: 'no voting record to compare' })
  } catch (err) {
    console.error('[rhetoric] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
