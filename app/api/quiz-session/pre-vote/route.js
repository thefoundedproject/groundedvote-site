// © 2025 The Founded Project LLC — All rights reserved.
// app/api/quiz-session/pre-vote/route.js
//
// POST { sessionId, candidateId?, rawText? } — records the optional
// pre-quiz stated preference ("If the election were tomorrow, who would
// you vote for?"). This is the "before" in the before/after reveal.
// Both fields null means the user answered and skipped; we store the
// skip so the results page knows the question was offered.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const limited = applyRateLimit(request, 'pre-vote', 20, 60)
  if (limited) return limited

  try {
    const { sessionId, candidateId, rawText } = await request.json().catch(() => ({}))
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    const session = await prisma.quizSession.findUnique({ where: { id: sessionId } })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.completedAt) return NextResponse.json({ error: 'Session already submitted' }, { status: 409 })

    // If a candidateId came in, make sure it belongs to this race
    let validCandidateId = null
    if (candidateId) {
      const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } })
      if (candidate?.raceId === session.raceId) validCandidateId = candidateId
    }

    await prisma.preQuizVote.upsert({
      where: { sessionId },
      create: {
        sessionId,
        candidateId: validCandidateId,
        rawText: rawText?.slice(0, 200) ?? null,
      },
      update: {
        candidateId: validCandidateId,
        rawText: rawText?.slice(0, 200) ?? null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[pre-vote] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
