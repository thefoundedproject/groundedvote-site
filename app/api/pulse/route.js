import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/pulse — anonymous aggregates for the Pulse page.
// Everything here is a count or an average over completed sessions.
// No session ids, no answers, no emails leave this route.

const MIN_RACE_N = 25   // a race shows its spread only past this many completions
const MIN_ISSUE_MARKS = 40 // the issue board waits for this many "very important" marks

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)

    const [
      raceCount, stateRaceCount, states, questionCount,
      totalSessions, completedSessions, weekSessions, answerCount,
      highMarks, perRace,
    ] = await Promise.all([
      prisma.race.count({ where: { year: 2026, raceType: 'GENERAL' } }),
      prisma.race.count({ where: { year: 2026, raceType: 'GENERAL', level: 'STATE' } }),
      prisma.race.findMany({ where: { year: 2026 }, select: { state: true }, distinct: ['state'] }),
      prisma.question.count({ where: { auditStatus: 'APPROVED' } }),
      prisma.quizSession.count(),
      prisma.quizSession.count({ where: { completedAt: { not: null } } }),
      prisma.quizSession.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.userAnswer.count(),
      prisma.userAnswer.findMany({
        where: { importance: 3 },
        select: { question: { select: { topic: true } } },
        take: 5000,
      }),
      prisma.quizSession.groupBy({
        by: ['raceId'],
        where: { completedAt: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { raceId: 'desc' } },
        take: 8,
      }),
    ])

    // Issue board: share of "very important" marks by topic
    const topicCounts = {}
    for (const a of highMarks) {
      const t = a.question?.topic || 'other'
      topicCounts[t] = (topicCounts[t] || 0) + 1
    }
    const totalMarks = highMarks.length
    const topIssues = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([topic, n]) => ({ topic, share: Math.round((n / Math.max(totalMarks, 1)) * 100) }))

    // Race progress toward the spread threshold
    const raceIds = perRace.map(r => r.raceId)
    const raceRows = raceIds.length
      ? await prisma.race.findMany({ where: { id: { in: raceIds } }, select: { id: true, label: true, district: true, chamber: true, level: true } })
      : []
    const labelOf = Object.fromEntries(raceRows.map(r => {
      const hasDistrict = r.district && !r.label.toLowerCase().includes('district')
      return [r.id, r.label + (hasDistrict ? ` · District ${r.district}` : '')]
    }))
    const raceProgress = perRace.map(r => ({
      label: labelOf[r.raceId] || 'Race',
      completions: r._count._all,
      threshold: MIN_RACE_N,
    }))

    // Spreads for races past the threshold: average score per candidate
    const ready = perRace.filter(r => r._count._all >= MIN_RACE_N)
    const spreads = []
    for (const r of ready) {
      const results = await prisma.quizResult.findMany({
        where: { session: { raceId: r.raceId, completedAt: { not: null } } },
        select: { scores: true },
      })
      const sums = {}
      for (const res of results) {
        for (const s of Array.isArray(res.scores) ? res.scores : []) {
          const key = s.candidateName || s.candidateId
          if (!sums[key]) sums[key] = { total: 0, n: 0 }
          sums[key].total += s.score
          sums[key].n += 1
        }
      }
      spreads.push({
        label: labelOf[r.raceId] || 'Race',
        completions: r._count._all,
        candidates: Object.entries(sums)
          .map(([name, v]) => ({ name, avgScore: Math.round(v.total / Math.max(v.n, 1)) }))
          .sort((a, b) => b.avgScore - a.avgScore),
      })
    }

    return NextResponse.json({
      updatedAt: now.toISOString(),
      engine: {
        races: raceCount,
        stateRaces: stateRaceCount,
        states: states.length,
        questionsAudited: questionCount,
      },
      activity: {
        totalSessions,
        completedSessions,
        weekSessions,
        answersRecorded: answerCount,
      },
      issues: {
        ready: totalMarks >= MIN_ISSUE_MARKS,
        totalMarks,
        threshold: MIN_ISSUE_MARKS,
        topIssues: totalMarks >= MIN_ISSUE_MARKS ? topIssues : [],
      },
      races: {
        threshold: MIN_RACE_N,
        progress: raceProgress,
        spreads,
      },
    }, {
      headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error('Pulse error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
