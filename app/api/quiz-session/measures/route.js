// © 2025 The Founded Project LLC — All rights reserved.
// app/api/quiz-session/measures/route.js
//
// POST { sessionId, answers: [{ measureId, answerValue }] }
// Stores a session's ballot-measure answers (1-5 scale). Runs after the
// candidate quiz submits, so a completed session is expected here.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const limited = applyRateLimit(request, 'measure-answers', 20, 60)
  if (limited) return limited

  try {
    const { sessionId, answers } = await request.json().catch(() => ({}))
    if (!sessionId || !Array.isArray(answers) || !answers.length) {
      return NextResponse.json({ error: 'sessionId and answers required' }, { status: 400 })
    }

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { race: { select: { state: true } } },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // Only measures from the session's state, with approved questions
    const valid = await prisma.ballotMeasure.findMany({
      where: {
        id: { in: answers.map(a => a.measureId) },
        state: session.race.state,
        auditStatus: 'APPROVED',
      },
      select: { id: true },
    })
    const validIds = new Set(valid.map(m => m.id))

    let saved = 0
    for (const a of answers) {
      if (!validIds.has(a.measureId)) continue
      const value = Number(a.answerValue)
      if (!(value >= 1 && value <= 5)) continue
      await prisma.measureAnswer.upsert({
        where: { sessionId_measureId: { sessionId, measureId: a.measureId } },
        create: { sessionId, measureId: a.measureId, answerValue: value },
        update: { answerValue: value },
      })
      saved++
    }
    return NextResponse.json({ ok: true, saved })
  } catch (err) {
    console.error('[measure-answers] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
