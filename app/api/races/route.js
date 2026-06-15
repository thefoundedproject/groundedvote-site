import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Race data changes only when an admin updates candidates or questions.
// Cache for 15 minutes on CDN; serve stale while revalidating in background.
export const revalidate = 900 // 15 min Next.js data cache

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state')

  try {
    const where = { year: 2026 }
    if (state) where.state = state.toUpperCase()

    const races = await prisma.race.findMany({
      where,
      include: {
        candidates: { select: { id: true, firstName: true, lastName: true, incumbent: true } },
        _count: { select: { questions: { where: { auditStatus: 'APPROVED' } } } },
      },
      orderBy: [{ chamber: 'asc' }, { state: 'asc' }],
    })

    return NextResponse.json(
      { races },
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
