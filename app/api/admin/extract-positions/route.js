/**
 * Admin endpoint: (re)extract candidate positions for a race or single candidate.
 * Use when:
 *   - A new challenger was added after questions exist
 *   - Questions were regenerated and positions need refresh
 *   - Initial extraction failed for some candidates
 *
 * POST /api/admin/extract-positions
 * Body: { raceId: string } OR { candidateId: string }
 * Optional: { overwrite: boolean } — re-score even if answer already exists
 */

import { NextResponse } from 'next/server'
import { extractPositionsForRace, extractPositionsForCandidate } from '@/lib/candidate-positions'

function isAuthorized(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { raceId, candidateId, overwrite = false } = await request.json()

    if (!raceId && !candidateId) {
      return NextResponse.json({ error: 'raceId or candidateId required' }, { status: 400 })
    }

    const summary = candidateId
      ? await extractPositionsForCandidate(candidateId, { overwrite })
      : await extractPositionsForRace(raceId, { overwrite })

    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    console.error('Extract-positions error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
