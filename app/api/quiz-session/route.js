import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/rate-limit'
import { trackEvent, EVENTS } from '@/lib/analytics'

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
      },
    })

    if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    if (race.questions.length === 0) {
      return NextResponse.json({ error: 'No approved questions for this race yet. Check back soon.' }, { status: 503 })
    }

    const session = await prisma.quizSession.create({
      data: { raceId },
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
