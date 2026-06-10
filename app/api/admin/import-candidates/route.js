/**
 * Admin endpoint: auto-import incumbent candidates from Congress.gov
 * for all seeded races (or a specific race).
 *
 * POST /api/admin/import-candidates
 * Headers: { Authorization: Bearer <ADMIN_SECRET> }
 * Body: { raceId?: string }  — omit to import all races
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = 'https://api.congress.gov/v3'

async function congressFetch(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', process.env.CONGRESS_API_KEY)
  url.searchParams.set('format', 'json')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Congress API ${res.status}: ${path}`)
  return res.json()
}

// Map state abbreviation + chamber to Congress.gov member list
async function fetchMembersForRace(state, chamber) {
  const chamberPath = chamber === 'SENATE' ? 'senate' : 'house'
  try {
    const data = await congressFetch(`/member/${state}/${chamberPath}`, {
      congress: 119,
      currentMember: true,
      limit: 20,
    })
    return data.members || []
  } catch (err) {
    console.error(`Failed to fetch ${state} ${chamber}:`, err.message)
    return []
  }
}

// Normalize party string
function normalizeParty(party) {
  if (!party) return 'Unknown'
  const p = party.toLowerCase()
  if (p.includes('democrat')) return 'Democrat'
  if (p.includes('republican')) return 'Republican'
  if (p.includes('independent')) return 'Independent'
  return party
}

export async function POST(request) {
  const auth = request.headers.get('Authorization')
  if (!process.env.ADMIN_SECRET || auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.CONGRESS_API_KEY) {
    return NextResponse.json({ error: 'CONGRESS_API_KEY not set' }, { status: 500 })
  }

  try {
    const { raceId } = await request.json().catch(() => ({}))

    const races = await prisma.race.findMany({
      where: raceId ? { id: raceId } : { year: 2026, isCompetitive: true },
    })

    const results = []

    for (const race of races) {
      const members = await fetchMembersForRace(race.state, race.chamber)

      // For House races, filter by district
      const relevant = race.chamber === 'HOUSE' && race.district
        ? members.filter(m => {
            const dist = m.district?.toString() || m.districtNumber?.toString()
            return dist === race.district
          })
        : members

      let imported = 0
      let skipped = 0

      for (const member of relevant) {
        const bioguideId = member.bioguideId || member.id
        const firstName = member.name?.split(',')[1]?.trim() || member.firstName || ''
        const lastName = member.name?.split(',')[0]?.trim() || member.lastName || ''
        const party = normalizeParty(member.partyName || member.party)

        if (!lastName) { skipped++; continue }

        const existing = await prisma.candidate.findFirst({
          where: { raceId: race.id, bioguideId },
        })

        if (existing) { skipped++; continue }

        await prisma.candidate.create({
          data: {
            raceId: race.id,
            firstName,
            lastName,
            party,
            bioguideId,
            incumbent: true,
          },
        })
        imported++
      }

      results.push({
        race: race.label,
        membersFound: members.length,
        relevant: relevant.length,
        imported,
        skipped,
      })
      console.log(`  ${race.label}: ${imported} imported, ${skipped} skipped`)
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('Import candidates error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
