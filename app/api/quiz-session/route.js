import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/rate-limit'
import { trackEvent, EVENTS } from '@/lib/analytics'
import { getSessionUser } from '@/lib/auth'

// POST /api/quiz-session — start a new session for a race
export async function POST(request) {
  const limited = applyRateLimit(request, 'quiz-session', 10, 60) // 10 sessions/min per IP
  if (limited) return limited

  try {
    const { raceId } = await request.json()
    if (!raceId) return NextResponse.json({ error: 'raceId required' }, { status: 400 })

    const race = await prisma.race.findUnique({
      where: { id: raceId },
      include: {
        questions: {
          where: { auditStatus: 'APPROVED' },
          orderBy: { weight: 'desc' },
          include: {
            candidateAnswers: { select: { candidateId: true, answerValue: true } },
          },
        },
        candidates: {
          where: { status: 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    if (race.questions.length === 0) {
      return NextResponse.json({ error: 'No approved questions for this race yet. Check back soon.' }, { status: 503 })
    }

    // Attach the signed-in user when there is one, so Civic Mirror
    // weighting applies and results persist to their account.
    const user = await getSessionUser()
    const session = await prisma.quizSession.create({
      data: { raceId, userId: user?.id ?? null },
    })

    // Track funnel event
    await trackEvent(EVENTS.QUIZ_STARTED, {
      sessionId: session.id,
      raceId,
      stateCode: race.state,
    })

    return NextResponse.json({
      sessionId: session.id,
      raceLabel: race.label,
      // Names only — party is never shown inside the quiz flow
      candidates: race.candidates.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
      })),
      questions: race.questions.map(q => ({
        id: q.id,
        topic: q.topic,
        questionText: q.questionText,
        weight: q.weight,
      })),
    })
  } catch (err) {
    console.error('Quiz session error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
