import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function checkAuth(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function POST(request) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidateId, topic, stance, sourceType, sourceUrl } = await request.json()
  if (!candidateId || !topic || !stance) return NextResponse.json({ error: 'candidateId, topic, and stance required' }, { status: 400 })

  const position = await prisma.position.create({
    data: { candidateId, topic, stance, sourceType: sourceType || 'CAMPAIGN_PLATFORM', sourceUrl: sourceUrl || null },
  })

  return NextResponse.json({ position })
}
