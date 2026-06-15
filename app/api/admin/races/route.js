import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ADMIN_SECRET = process.env.ADMIN_SECRET

function authorized(req) {
  return req.headers.get('x-admin-secret') === ADMIN_SECRET
}

// GET /api/admin/races — list all races
export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const races = await prisma.race.findMany({
    orderBy: [{ year: 'desc' }, { state: 'asc' }],
    include: { _count: { select: { candidates: true, questions: true } } },
  })
  return NextResponse.json(races)
}

// POST /api/admin/races — create a race
export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { label, state, stateFull, chamber, district, year } = body

  if (!label || !state || !chamber || !year) {
    return NextResponse.json({ error: 'label, state, chamber, year required' }, { status: 400 })
  }

  const race = await prisma.race.create({
    data: { label, state, stateFull: stateFull ?? state, chamber, district: district ?? null, year: Number(year), isCompetitive: true },
  })
  return NextResponse.json(race, { status: 201 })
}

// PATCH /api/admin/races — update a race
export async function PATCH(req) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const race = await prisma.race.update({ where: { id }, data })
  return NextResponse.json(race)
}
