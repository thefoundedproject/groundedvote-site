// © 2025 The Founded Project LLC — All rights reserved.
// lib/research.js
//
// Anonymized civic research aggregates.
//
// Privacy rules, enforced here by construction:
//   1. User-derived metrics include ONLY sessions belonging to accounts
//      that checked the research opt-in at signup.
//   2. Any cohort under MIN_COHORT (50) is suppressed entirely — the
//      output says so and carries no counts that could identify anyone.
//   3. Geography is never finer than state.
//   4. No individual rows ever leave this module — only sums and rates.
//
// Platform coverage stats (races, questions, evidence mix) describe the
// database, not people, and are safe at any size.

import { prisma } from './prisma.js'

export const MIN_COHORT = 50

/** "2026-Q3" → [start, end) date range. Returns null for bad input. */
export function periodRange(period) {
  const m = /^(\d{4})-Q([1-4])$/.exec(period ?? '')
  if (!m) return null
  const year = Number(m[1])
  const q = Number(m[2])
  const start = new Date(Date.UTC(year, (q - 1) * 3, 1))
  const end = new Date(Date.UTC(year, q * 3, 1))
  return { start, end }
}

/** The current period string, from a supplied date. */
export function currentPeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`
}

/**
 * Aggregate research metrics for one geography ("US" or a state code)
 * and one period. Returns { suppressed: true } when the opt-in cohort
 * is under MIN_COHORT.
 */
export async function computeAggregate(geography, period) {
  const range = periodRange(period)
  if (!range) throw new Error(`Bad period: ${period} (expected e.g. 2026-Q3)`)

  const where = {
    completed: true,
    completedAt: { gte: range.start, lt: range.end },
    user: { is: { researchOptIn: true } },
    ...(geography !== 'US' ? { race: { is: { state: geography } } } : {}),
  }

  const sessions = await prisma.quizSession.findMany({
    where,
    select: {
      id: true,
      race: { select: { state: true, chamber: true } },
      preQuizVote: { select: { candidateId: true, rawText: true } },
      result: { select: { scores: true } },
      user: { select: { issuePriorities: { select: { issue: true, weight: true } } } },
    },
  })

  const cohort = sessions.length
  if (cohort < MIN_COHORT) {
    return {
      geography,
      period,
      suppressed: true,
      note: `Fewer than ${MIN_COHORT} opted-in completed sessions in this geography and period. Aggregates are withheld to protect participants.`,
    }
  }

  // ── Before/after gap analysis ──
  let answeredPre = 0
  let matchedOwnPick = 0
  let alignedElsewhere = 0
  const topScores = []
  for (const s of sessions) {
    const scores = Array.isArray(s.result?.scores) ? s.result.scores : []
    const top = scores[0]
    if (top?.alignmentScore != null) topScores.push(top.alignmentScore)
    if (s.preQuizVote?.candidateId && top) {
      answeredPre++
      if (s.preQuizVote.candidateId === top.candidateId) matchedOwnPick++
      else alignedElsewhere++
    }
  }

  // ── Issue salience (primary/secondary picks of these users) ──
  const salience = {}
  for (const s of sessions) {
    for (const p of s.user?.issuePriorities ?? []) {
      salience[p.issue] = (salience[p.issue] ?? 0) + 1
    }
  }

  const rate = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)

  return {
    geography,
    period,
    suppressed: false,
    cohort,
    beforeAfter: {
      answeredPreQuestion: answeredPre,
      answeredPreQuestionRate: rate(answeredPre, cohort),
      // The headline number: of voters who named a pick beforehand,
      // how many aligned with someone else
      alignedWithOwnPickRate: rate(matchedOwnPick, answeredPre),
      alignedElsewhereRate: rate(alignedElsewhere, answeredPre),
    },
    alignment: {
      meanTopMatchScore: topScores.length
        ? Math.round(topScores.reduce((a, b) => a + b, 0) / topScores.length)
        : null,
    },
    issueSalience: salience, // { issueKey: count of opted-in users selecting it }
    generatedAt: new Date().toISOString(),
  }
}

/** Platform coverage — describes the database, not people. Always safe. */
export async function platformCoverage() {
  const [races, candidates, approvedQuestions, answers, evidence] = await Promise.all([
    prisma.race.count(),
    prisma.candidate.count(),
    prisma.question.count({ where: { auditStatus: 'APPROVED' } }),
    prisma.candidateAnswer.count(),
    prisma.candidateAnswer.groupBy({ by: ['evidenceType'], _count: true }),
  ])
  return {
    races,
    candidates,
    approvedQuestions,
    scoredPositions: answers,
    evidenceMix: Object.fromEntries(evidence.map(e => [e.evidenceType, e._count])),
  }
}

/** States that pass the cohort floor for a period (listable publicly). */
export async function availableGeographies(period) {
  const range = periodRange(period)
  if (!range) return []
  const rows = await prisma.quizSession.groupBy({
    by: ['raceId'],
    where: {
      completed: true,
      completedAt: { gte: range.start, lt: range.end },
      user: { is: { researchOptIn: true } },
    },
    _count: true,
  })
  if (!rows.length) return []
  const races = await prisma.race.findMany({
    where: { id: { in: rows.map(r => r.raceId) } },
    select: { id: true, state: true },
  })
  const stateOf = Object.fromEntries(races.map(r => [r.id, r.state]))
  const byState = {}
  for (const r of rows) {
    const s = stateOf[r.raceId]
    if (s) byState[s] = (byState[s] ?? 0) + r._count
  }
  return Object.entries(byState)
    .filter(([, n]) => n >= MIN_COHORT)
    .map(([state]) => state)
    .sort()
}

/** Persist snapshots for every qualifying geography (plus US). Idempotent per period. */
export async function generateSnapshots(period) {
  const geos = ['US', ...(await availableGeographies(period))]
  let written = 0
  for (const geography of geos) {
    const data = await computeAggregate(geography, period)
    if (data.suppressed) continue
    await prisma.researchSnapshot.upsert({
      where: { geography_period: { geography, period } },
      create: { geography, period, data },
      update: { data },
    })
    written++
  }
  return { period, considered: geos.length, written }
}

/** Flatten an aggregate into CSV (one row) for journalism partners. */
export function toCsv(agg) {
  if (agg.suppressed) {
    return 'geography,period,suppressed\n' + `${agg.geography},${agg.period},true\n`
  }
  const salienceCols = Object.entries(agg.issueSalience).map(([k, v]) => [`salience_${k}`, v])
  const cols = [
    ['geography', agg.geography],
    ['period', agg.period],
    ['cohort', agg.cohort],
    ['answered_pre_question_rate', agg.beforeAfter.answeredPreQuestionRate],
    ['aligned_with_own_pick_rate', agg.beforeAfter.alignedWithOwnPickRate],
    ['aligned_elsewhere_rate', agg.beforeAfter.alignedElsewhereRate],
    ['mean_top_match_score', agg.alignment.meanTopMatchScore],
    ...salienceCols,
  ]
  return cols.map(c => c[0]).join(',') + '\n' + cols.map(c => c[1] ?? '').join(',') + '\n'
}
