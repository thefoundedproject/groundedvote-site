import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function getStartDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - parseInt(days))
  return d
}

export async function GET(req) {
  const secret = req.headers.get("x-admin-secret")
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const days = searchParams.get("days") || 30
  const since = getStartDate(days)

  const [events, alignments, quizResults, waitlistByState] = await Promise.all([
    prisma.quizEvent.groupBy({ by: ["event"], _count: { id: true }, where: { createdAt: { gte: since } } }),
    prisma.userAnswer.findMany({ where: { quizSession: { createdAt: { gte: since } } }, select: { answer: true, question: { select: { topic: true } } } }),
    prisma.quizResult.findMany({ where: { createdAt: { gte: since } }, select: { scoresJson: true, raceId: true } }),
    prisma.waitlistEntry.groupBy({ by: ["stateCode"], _count: { id: true } }),
  ])

  const funnel = { started: 0, completed: 0, emailed: 0, shared: 0 }
  events.forEach(e => {
    if (e.event === "quiz_started") funnel.started = e._count.id
    if (e.event === "quiz_completed") funnel.completed = e._count.id
    if (e.event === "results_emailed") funnel.emailed = e._count.id
    if (e.event === "results_shared") funnel.shared = e._count.id
  })

  const topicMap = {}
  alignments.forEach(({ answer, question }) => {
    const topic = question?.topic || "GENERAL"
    if (!topicMap[topic]) topicMap[topic] = { oppose: 0, neutral: 0, support: 0, total: 0 }
    topicMap[topic].total++
    if (answer <= 1) topicMap[topic].oppose++
    else if (answer === 2) topicMap[topic].neutral++
    else topicMap[topic].support++
  })
  const issueDistributions = Object.entries(topicMap).map(([topic, c]) => ({
    topic,
    opposePercent: c.total ? Math.round((c.oppose / c.total) * 100) : 0,
    neutralPercent: c.total ? Math.round((c.neutral / c.total) * 100) : 0,
    supportPercent: c.total ? Math.round((c.support / c.total) * 100) : 0,
    total: c.total,
  })).sort((a, b) => b.total - a.total)

  const candidateScores = {}
  quizResults.forEach(result => {
    if (!result.scoresJson) return
    let scores
    try { scores = JSON.parse(result.scoresJson) } catch { return }
    scores.forEach(({ candidateId, candidateName, alignmentScore }) => {
      if (!candidateScores[candidateId]) candidateScores[candidateId] = { candidateName, total: 0, count: 0 }
      candidateScores[candidateId].total += alignmentScore || 0
      candidateScores[candidateId].count++
    })
  })
  const candidatePatterns = Object.entries(candidateScores)
    .map(([id, v]) => ({ candidateId: id, candidateName: v.candidateName, avgScore: v.count ? Math.round(v.total / v.count) : 0, quizCount: v.count }))
    .sort((a, b) => b.quizCount - a.quizCount).slice(0, 20)

  const sessionsByState = await prisma.quizEvent.groupBy({
    by: ["stateCode"], _count: { id: true },
    where: { event: "quiz_started", createdAt: { gte: since }, stateCode: { not: null } },
  })

  return NextResponse.json({
    funnel, issueDistributions, candidatePatterns,
    geography: {
      sessions: sessionsByState.map(r => ({ state: r.stateCode, count: r._count.id })).sort((a, b) => b.count - a.count),
      waitlist: waitlistByState.map(r => ({ state: r.stateCode, count: r._count.id })).sort((a, b) => b.count - a.count),
    },
    period: { days: parseInt(days), since: since.toISOString() },
  })
}
