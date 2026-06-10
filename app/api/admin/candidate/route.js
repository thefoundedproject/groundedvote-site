import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function checkAuth(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function POST(request) {
  if (!checkAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { raceId, firstName, lastName, party, incumbent, website } = await request.json(), photoUrl }
  if (!raceId || !lastName) return NextResponse.json({ error: 'raceId and lastName required' }, { status: 400 })

  const candidate = await prisma.candidate.create({
    data: { raceId, firstName: firstName || '', lastName, party: party || '', incumbent: !!incumbent, website: website || null, photoUrl: photoUrl || null },
  })

  return NextResponse.json({ candidate })
}
