import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function checkAuth(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function GET(request) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leads = await prisma.awarenessLead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      profile: true,
      notifyState: true,
      notified: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ leads })
}
