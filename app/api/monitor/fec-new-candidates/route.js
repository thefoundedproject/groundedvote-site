// Copyright © 2025 The Founded Project LLC — All Rights Reserved
// Proprietary and Confidential. Unauthorized use prohibited.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fecFetch, getFecApiKey } from '@/lib/fec-client'

// Overall time budget for this route. run-all aborts us after 120s, so we stop
// retrying at 100s and report partial results rather than getting killed mid-run.
const RUN_BUDGET_MS = Number(process.env.FEC_RUN_BUDGET_MS || 100_000)

export async function GET(request) {
  const secret = request.headers.get('x-monitor-secret')
  if (!secret || secret !== process.env.MONITOR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { apiKey, degraded, warning } = getFecApiKey()
  if (degraded) console.warn('[monitor/fec-new-candidates]', warning)

  const deadline = Date.now() + RUN_BUDGET_MS
  const changes = []
  const errors = []
  // Races we genuinely could not check, as opposed to races with no new filings.
  // Without this the caller cannot tell a clean scan from a silent gap.
  const skipped = []

  try {
    // Pull all races from DB, grouped by state+chamber+district
    const races = await prisma.race.findMany({
      where: { year: 2026 },
      include: {
        candidates: {
          select: { id: true, firstName: true, lastName: true, fecCandidateId: true, party: true }
        }
      }
    })

    for (const race of races) {
      try {
        const office = race.chamber === 'HOUSE' ? 'H' : 'S'
        const params = {
          election_year: '2026',
          state: race.state,
          office,
          per_page: '100',
          sort: '-load_date',
        }
        if (race.chamber === 'HOUSE' && race.district) {
          params.district = String(race.district).padStart(2, '0')
        }

        const result = await fecFetch('/candidates/', params, { apiKey, deadline })

        if (!result.ok) {
          const label = `${race.state} ${race.chamber}${race.district ? ` ${race.district}` : ''}`
          errors.push(
            `FEC ${label}: ${result.error} after ${result.attempts} attempt(s)`
          )
          skipped.push({ raceId: race.id, label, reason: result.error, status: result.status })
          continue
        }
        const data = result.data

        // Build lookup sets for existing candidates in this race
        const existingFecIds = new Set(
          race.candidates.map(c => c.fecCandidateId).filter(Boolean)
        )
        const existingNames = new Set(
          race.candidates.map(c => `${c.firstName} ${c.lastName}`.toLowerCase())
        )

        for (const fc of (data.results || [])) {
          const fecId = fc.candidate_id
          // Normalize FEC name format "LAST, FIRST MIDDLE" → "first last"
          const rawName = (fc.name || '').toLowerCase()
          const [last, ...rest] = rawName.split(',')
          const normalizedName = `${rest.join(' ').trim()} ${last.trim()}`.trim()

          const alreadyById = existingFecIds.has(fecId)
          const alreadyByName = existingNames.has(normalizedName) ||
            existingNames.has(rawName)

          if (!alreadyById && !alreadyByName) {
            const party = fc.party || 'UNK'
            changes.push({
              type: 'NEW_CANDIDATE_FILED',
              raceId: race.id,
              title: `New FEC filing: ${fc.name} (${party}) — ${race.label}`,
              description: `FEC ID ${fecId} filed for ${race.label}. Party: ${party}. Status: ${fc.candidate_status || 'unknown'}. Election: ${fc.election_districts?.join(',') || 'N/A'}. Not yet in GroundedVote DB — needs review and possible addition.`,
              sourceUrl: `https://www.fec.gov/data/candidate/${fecId}/`,
            })
          }
        }
      } catch (raceErr) {
        errors.push(`Race ${race.id}: ${raceErr.message}`)
      }
    }

    // Persist all new changes
    if (changes.length > 0) {
      await prisma.monitoringChange.createMany({
        data: changes.map(c => ({
          type: c.type,
          raceId: c.raceId || null,
          title: c.title,
          description: c.description,
          sourceUrl: c.sourceUrl || null,
        })),
        skipDuplicates: false,
      })
    }

    return NextResponse.json({
      ok: true,
      // racesChecked used to report every race in the DB, including ones we never
      // successfully reached. Report the honest number and surface the gap.
      racesTotal: races.length,
      racesChecked: races.length - skipped.length,
      racesSkipped: skipped.length,
      skipped,
      degradedApiKey: degraded,
      apiKeyWarning: warning,
      newChanges: changes.length,
      errors: errors.length,
      changes: changes.map(c => ({ title: c.title, raceId: c.raceId })),
      errorList: errors,
    })
  } catch (err) {
    console.error('[monitor/fec-new-candidates]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
