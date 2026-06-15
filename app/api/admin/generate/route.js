/**
 * Admin endpoint: trigger bias-audit question generation for a race,
 * then automatically extract candidate position scores.
 *
 * POST /api/admin/generate
 * Headers: { Authorization: Bearer <ADMIN_SECRET> }
 * Body: { raceId: string, extractPositions?: boolean (default true) }
 */

import { NextResponse } from 'next/server'
import { generateQuestionsForRace } from '@/lib/bias-audit'
import { extractPositionsForRace } from '@/lib/candidate-positions'

function isAuthorized(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { raceId, extractPositions = true } = await request.json()
    if (!raceId) return NextResponse.json({ error: 'raceId required' }, { status: 400 })

    // Step 1: Generate and audit questions
    console.log(`[generate] Starting question generation for race ${raceId}`)
    const questions = await generateQuestionsForRace(raceId)
    console.log(`[generate] Generated ${questions.length} approved questions`)

    let positionSummary = null

    // Step 2: Auto-extract candidate positions against the new questions
    if (extractPositions) {
      console.log(`[generate] Extracting candidate positions...`)
      try {
        positionSummary = await extractPositionsForRace(raceId)
        console.log(`[generate] Positions: ${positionSummary.created} created, ${positionSummary.skipped} skipped, ${positionSummary.failed} failed`)
      } catch (posErr) {
        // Non-fatal — questions were created, positions can be retried
        console.error('[generate] Position extraction error:', posErr.message)
        positionSummary = { error: posErr.message }
      }
    }

    return NextResponse.json({
      success: true,
      questions: questions.length,
      positions: positionSummary,
    })
  } catch (err) {
    console.error('Admin generate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
