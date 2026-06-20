// © 2025 The Founded Project LLC — All rights reserved.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Run counts sequentially to avoid connection pool exhaustion (connection_limit: 1)
export async function GET() {
  try {
    const raceCount = await prisma.race.count();
    const candidateCount = await prisma.candidate.count();
    const positionCount = await prisma.position.count();
    const questionCount = await prisma.question.count({ where: { approved: true } });
    const quizSessionCount = await prisma.quizSession.count();
    const awarenessLeadCount = await prisma.awarenessLead.count();
    const quizStarted = await prisma.quizEvent.count({ where: { event: 'STARTED' } });
    const quizCompleted = await prisma.quizEvent.count({ where: { event: 'COMPLETED' } });
    const quizEmailed = await prisma.quizEvent.count({ where: { event: 'EMAILED' } });
    const quizShared = await prisma.quizEvent.count({ where: { event: 'SHARED' } });

    const races = await prisma.race.findMany({
      include: {
        candidates: { select: { id: true } },
        questions: { where: { approved: true }, select: { id: true } },
      },
      orderBy: [{ state: 'asc' }, { chamber: 'asc' }],
    });

    return NextResponse.json({
      counts: {
        races: raceCount,
        candidates: candidateCount,
        positions: positionCount,
        questions: questionCount,
        quizSessions: quizSessionCount,
        awarenessLeads: awarenessLeadCount,
      },
      funnel: {
        started: quizStarted,
        completed: quizCompleted,
        emailed: quizEmailed,
        shared: quizShared,
      },
      races,
    });
  } catch (err) {
    console.error('admin overview error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
