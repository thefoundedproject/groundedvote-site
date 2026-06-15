import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFunnelStats } from '@/lib/analytics'

function checkAuth(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function GET(request) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [races, stats, funnel] = await Promise.all([
    prisma.race.findMany({
      where: { year: 2026 },
      include: {
        candidates: { include: { positions: { select: { id: true, topic: true, stance: true } } } },
        _count: { select: { questions: { where: { auditStatus: 'APPROVED' } } } },
      },
      orderBy: [{ chamber: 'asc' }, { state: 'asc' }],
    }),
    Promise.all([
      prisma.race.count(),
      prisma.candidate.count(),
      prisma.position.count(),
      prisma.question.count({ where: { auditStatus: 'APPROVED' } }),
      prisma.quizSession.count({ where: { completed: true } }),
      prisma.awarenessLead.count(),
    ]).then(([races, candidates, positions, approvedQuestions, sessions, leads]) => ({
      races, candidates, positions, approvedQuestions, sessions, leads,
    })),
    getFunnelStats(30),
  ])

  return NextResponse.json({ races, stats, funnel })
}
