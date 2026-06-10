/**
 * GET /api/quiz-session/results?sessionId=xxx
 * Returns full result detail with per-question breakdown and source notes.
 */

import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-error'

export async function GET(request) {
  // This is a heavy multi-join query — rate limit per IP to prevent scraping / DoS.
  const limited = applyRateLimit(request, 'quiz-results', 30, 60) // 30/min per IP
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 })

  try {
    const result = await prisma.quizResult.findUnique({ where: { sessionId } })
    if (!result) return Response.json({ error: 'Result not found' }, { status: 404 })

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        userAnswers: {
          include: {
            question: {
              include: {
                candidateAnswers: {
                  include: { candidate: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        race: { include: { candidates: true } },
      },
    })

    const breakdown = session.userAnswers.map(ua => ({
      questionId: ua.question.id,
      topic: ua.question.topic,
      questionText: ua.question.questionText,
      userValue: ua.answerValue,
      importance: ua.importance,
      candidates: ua.question.candidateAnswers.map(ca => ({
        candidateId: ca.candidateId,
        candidateName: `${ca.candidate.firstName} ${ca.candidate.lastName}`,
        answerValue: ca.answerValue,
        confidence: ca.confidence,
        sourceNote: ca.sourceNote,
        evidenceType: ca.evidenceType, // drives source badge display (Priority 3)
      })),
    }))

    return Response.json({
      scores: result.scores,
      topIssues: result.topIssues,
      breakdown,
      race: {
        id: session.race.id,
        label: session.race.label,
        chamber: session.race.chamber,
        state: session.race.state,
        candidates: session.race.candidates.map(c => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          party: c.party,
        })),
      },
    })
  } catch (err) {
    return apiError(err, 'quiz-session:results')
  }
}
