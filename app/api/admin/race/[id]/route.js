import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function checkAuth(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function GET(request, { params }) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const race = await prisma.race.findUnique({
    where: { id: params.id },
    include: {
      candidates: { include: { positions: true } },
      questions: { where: { auditStatus: 'APPROVED' }, select: { id: true, topic: true, questionText: true, biasScore: true } },
    },
  })

  if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ race })
}
