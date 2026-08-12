import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Race data changes only when an admin updates candidates or questions.
// Cache for 15 minutes on CDN; serve stale while revalidating in background.
export const revalidate = 900 // 15 min Next.js data cache

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state')
  // OCD division IDs from the geocoder — when present, the response also
  // carries the caller's own state-legislature races. Without them the
  // list stays FEDERAL so browse views aren't flooded by 200+ seats.
  const sldl = searchParams.get('sldl')
  const sldu = searchParams.get('sldu')

  try {
    const where = { year: 2026, level: 'FEDERAL' }
    if (state) where.state = state.toUpperCase()

    const include = {
      candidates: {
        where: { status: { notIn: ['LOST_PRIMARY', 'WITHDREW'] } },
        select: { id: true, firstName: true, lastName: true, incumbent: true },
      },
      _count: { select: { questions: { where: { auditStatus: 'APPROVED' } } } },
    }

    const [races, stateRaces] = await Promise.all([
      prisma.race.findMany({ where, include, orderBy: [{ chamber: 'asc' }, { state: 'asc' }] }),
      (sldl || sldu)
        ? prisma.race.findMany({
            where: { year: 2026, level: 'STATE', ocdDivisionId: { in: [sldl, sldu].filter(Boolean) } },
            include,
            orderBy: { chamber: 'asc' },
          })
        : Promise.resolve([]),
    ])

    return NextResponse.json(
      { races, stateRaces },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (err) {
    console.error('Races API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
  })
}
