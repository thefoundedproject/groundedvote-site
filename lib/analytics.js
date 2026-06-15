/**
 * Server-side quiz funnel analytics.
 * Call these from API routes — never from client components.
 * No PII stored: session IDs and aggregate counts only.
 */
import { prisma } from './prisma'

export const EVENTS = {
  QUIZ_STARTED: 'quiz_started',
  QUIZ_COMPLETED: 'quiz_completed',
  RESULTS_EMAILED: 'results_emailed',
  RESULTS_SHARED: 'results_shared',
}

/**
 * @param {string} event - one of EVENTS
 * @param {object} opts  - { sessionId?, raceId?, stateCode?, metadata? }
 */
export async function trackEvent(event, opts = {}) {
  try {
    await prisma.quizEvent.create({
      data: {
        event,
        sessionId: opts.sessionId ?? null,
        raceId: opts.raceId ?? null,
        stateCode: opts.stateCode ?? null,
        metadata: opts.metadata ?? undefined,
      },
    })
  } catch (err) {
    // Never let analytics failures break the user flow
    console.error('[analytics] trackEvent failed:', err.message)
  }
}

/**
 * Funnel summary for admin overview.
 * Returns counts for last N days.
 */
export async function getFunnelStats(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [started, completed, emailed, shared] = await Promise.all([
    prisma.quizEvent.count({ where: { event: EVENTS.QUIZ_STARTED, createdAt: { gte: since } } }),
    prisma.quizEvent.count({ where: { event: EVENTS.QUIZ_COMPLETED, createdAt: { gte: since } } }),
    prisma.quizEvent.count({ where: { event: EVENTS.RESULTS_EMAILED, createdAt: { gte: since } } }),
    prisma.quizEvent.count({ where: { event: EVENTS.RESULTS_SHARED, createdAt: { gte: since } } }),
  ])

  return {
    days,
    started,
    completed,
    emailed,
    shared,
    completionRate: started > 0 ? Math.round(completed / started * 100) : 0,
    emailRate: completed > 0 ? Math.round(emailed / completed * 100) : 0,
  }
}
