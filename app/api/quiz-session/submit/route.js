import { prisma } from '@/lib/prisma'
import { computeAlignment, saveResult } from '@/lib/matching'
import { trackEvent, EVENTS } from '@/lib/analytics'
import { apiError } from '@/lib/api-error'

export async function POST(request) {
  try {
    const { sessionId, answers } = await request.json()
    // answers: [{ questionId, answerValue, importance? }]

    if (!sessionId || !answers?.length) {
      return Response.json({ error: 'sessionId and answers required' }, { status: 400 })
    }

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { race: { select: { state: true } } },
    })
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 })
    if (session.completedAt) return Response.json({ error: 'Session already submitted' }, { status: 409 })

    // Build importance map: { questionId: 1|2|3 }
    const importanceMap = {}
    for (const a of answers) {
      if (a.importance) importanceMap[a.questionId] = a.importance
    }

    // Upsert user answers (store importance value)
    await prisma.$transaction(
      answers.map(({ questionId, answerValue, importance }) =>
        prisma.userAnswer.upsert({
          where: { sessionId_questionId: { sessionId, questionId } },
          create: { sessionId, questionId, answerValue, importance: importance ?? 2 },
          update: { answerValue, importance: importance ?? 2 },
        })
      )
    )

    // Mark session complete
    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date() },
    })

    // Compute weighted alignment (importance-aware)
    const { scores, topIssues } = await computeAlignment(sessionId, importanceMap)

    // Track completion
    await trackEvent(EVENTS.QUIZ_COMPLETED, {
      sessionId,
      raceId: session.raceId,
      stateCode: session.race?.state,
      metadata: { topScore: scores?.[0]?.alignmentScore },
    })

    // Persist result
    await saveResult(sessionId, { scores, topIssues })

    return Response.json({ scores, topIssues })
  } catch (err) {
    return apiError(err, 'quiz-session:submit')
  }
}
