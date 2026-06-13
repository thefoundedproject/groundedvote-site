/**
 * Admin endpoint: auto-import incumbent candidates from Congress.gov
 * for all seeded races (or a specific race).
 *
 * POST /api/admin/import-candidates
 * Headers: { Authorization: Bearer <ADMIN_SECRET> }
 * Body: { raceId?: string }  — omit to import all races
 *
 * NOTE: Congress.gov API v3 /member?stateCode= and ?chamber= params are silently
 * ignored. We fetch ALL 119th Congress members via /member/congress/119 (paginated)
 * and filter client-side by state, chamber, and district.
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

/**
 * Fetch ALL current members of the 119th Congress via pagination.
 * Congress.gov returns max 250 per page; 119th has ~552 members.
 */
async function fetchAllMembers119() {
  const allMembers = []
  let offset = 0
  const limit = 250

  while (true) {
    const data = await congressFetch('/member/congress/119', { limit, offset })
    const batch = data.members || []
    allMembers.push(...batch)
    if (batch.length < limit) break
    offset += limit
    // Safety cap — never loop more than 6 pages (1500 members)
    if (offset > 1500) break
  }

  console.log(`Fetched ${allMembers.length} total members from Congress.gov`)
  return allMembers
}

/**
 * Filter the full member list for a specific race.
 * Uses client-side filtering because Congress.gov API ignores stateCode/chamber params.
 */
function filterMembersForRace(allMembers, stateFull, chamber, district) {
  const chamberFull = chamber === 'SENATE' ? 'Senate' : 'House of Representatives'

  return allMembers.filter(m => {
    // Match state (full name e.g. "Arizona")
    if (m.state !== stateFull) return false

    // Match chamber from most recent term
    const latestTerm = m.terms?.item?.slice(-1)?.[0]
    if (!latestTerm || latestTerm.chamber !== chamberFull) return false

    // For House races, match district number
    if (chamber === 'HOUSE' && district) {
      const memberDistrict = (m.district ?? '').toString()
      return memberDistrict === district.toString()
    }

    return true
  })
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
      where: raceId ? { id: raceId } : { year: 2026 },
    })

    if (races.length === 0) {
      return NextResponse.json({ error: 'No races found. Seed races first.' }, { status: 404 })
    }

    // Fetch all members ONCE, then filter per race
    const allMembers = await fetchAllMembers119()

    const results = []

    for (const race of races) {
      const relevant = filterMembersForRace(allMembers, race.stateFull, race.chamber, race.district)

      let imported = 0
      let skipped = 0

      for (const member of relevant) {
        const bioguideId = member.bioguideId
        // Congress.gov name format: "Last, First Middle"
        const nameParts = member.name?.split(',') || []
        const lastName = nameParts[0]?.trim() || ''
        const firstName = nameParts[1]?.trim() || ''
        const party = normalizeParty(member.partyName)

        if (!lastName || !bioguideId) { skipped++; continue }

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
        state: race.stateFull,
        chamber: race.chamber,
        district: race.district,
        membersFound: relevant.length,
        imported,
        skipped,
      })
      console.log(`  ${race.label}: found=${relevant.length}, imported=${imported}, skipped=${skipped}`)
    }

    const totalImported = results.reduce((s, r) => s + r.imported, 0)
    const noMatches = results.filter(r => r.membersFound === 0)

    return NextResponse.json({
      success: true,
      totalRaces: races.length,
      totalImported,
      noMatchRaces: noMatches.length,
      results,
    })
  } catch (err) {
    console.error('Import candidates error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
