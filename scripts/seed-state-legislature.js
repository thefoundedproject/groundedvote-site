// © 2025 The Founded Project LLC — All rights reserved.
// scripts/seed-state-legislature.js
//
// Seeds state legislature races (level=STATE) with incumbent legislators
// from the OpenStates v3 people API. Pilot scope: one state at a time.
//
//   node scripts/seed-state-legislature.js --state MN            # dry run
//   node scripts/seed-state-legislature.js --state MN --apply    # write
//
// Every 2026 seat gets a Race row keyed by its OCD division ID (exact
// address matching) and one ACTIVE incumbent Candidate. Challengers
// arrive later from filings. Requires OPENSTATES_API_KEY.

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const STATE = (() => {
  const i = process.argv.indexOf('--state')
  return i !== -1 ? process.argv[i + 1]?.toUpperCase() : null
})()

const API = 'https://v3.openstates.org'
const KEY = process.env.OPENSTATES_API_KEY
const YEAR = 2026

const STATE_FULL = { MN: 'Minnesota' } // extend as pilots expand

const sleep = ms => new Promise(r => setTimeout(r, ms))

/** All current members of one chamber, paged. org_classification: upper|lower */
async function fetchLegislators(stateCode, orgClassification) {
  const people = []
  let page = 1
  for (;;) {
    const url = `${API}/people?jurisdiction=${stateCode.toLowerCase()}&org_classification=${orgClassification}&per_page=50&page=${page}&apikey=${KEY}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OpenStates ${res.status}: ${(await res.text()).slice(0, 120)}`)
    const data = await res.json()
    people.push(...(data.results ?? []))
    if (page >= (data.pagination?.max_page ?? 1)) break
    page++
    await sleep(600) // free tier is rate-limited per minute
  }
  return people
}

/** "64A" from an OCD ID like .../sldl:64a */
function districtFromOcd(ocdId) {
  const m = /:(?:sldl|sldu):(.+)$/.exec(ocdId)
  return m ? m[1].toUpperCase() : null
}

function splitName(name) {
  const parts = name.trim().split(/\s+/)
  return { firstName: parts.slice(0, -1).join(' ') || parts[0], lastName: parts.at(-1) }
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to write ===')
  if (!KEY) throw new Error('OPENSTATES_API_KEY is not set')
  if (!STATE || !STATE_FULL[STATE]) throw new Error(`--state required (supported: ${Object.keys(STATE_FULL).join(', ')})`)

  const summary = { races: 0, candidates: 0, skippedNoDistrict: 0 }

  for (const [org, chamber, label] of [['lower', 'HOUSE', 'State House'], ['upper', 'SENATE', 'State Senate']]) {
    const people = await fetchLegislators(STATE, org)
    console.log(`\n${STATE} ${label}: ${people.length} sitting legislator(s)`)

    // Group by district — vacancies produce races with no incumbent later;
    // for now a race exists wherever a legislator sits.
    const byDistrict = new Map()
    for (const p of people) {
      const ocd = p.current_role?.division_id
      const district = p.current_role?.district?.toString().toUpperCase() ?? districtFromOcd(ocd ?? '')
      if (!ocd || !district) { summary.skippedNoDistrict++; continue }
      if (!byDistrict.has(ocd)) byDistrict.set(ocd, { district, incumbents: [] })
      byDistrict.get(ocd).incumbents.push(p)
    }

    for (const [ocd, { district, incumbents }] of byDistrict) {
      const raceLabel = `${STATE_FULL[STATE]} ${label} District ${district} ${YEAR}`
      summary.races++
      if (!APPLY) {
        console.log(`  • ${raceLabel} — ${incumbents.map(p => p.name).join(', ')}`)
        continue
      }

      let race = await prisma.race.findFirst({ where: { ocdDivisionId: ocd, year: YEAR } })
      if (!race) {
        race = await prisma.race.create({
          data: {
            state: STATE,
            stateFull: STATE_FULL[STATE],
            chamber,
            district,
            level: 'STATE',
            ocdDivisionId: ocd,
            year: YEAR,
            label: raceLabel,
          },
        })
      }

      for (const p of incumbents) {
        const { firstName, lastName } = splitName(p.name)
        const existing = await prisma.candidate.findFirst({
          where: { raceId: race.id, firstName, lastName },
          select: { id: true },
        })
        if (existing) continue
        await prisma.candidate.create({
          data: {
            raceId: race.id,
            firstName,
            lastName,
            party: p.party ?? 'Unknown',
            incumbent: true,
            website: p.links?.[0]?.url ?? null,
            imageUrl: p.image || null,
          },
        })
        summary.candidates++
      }
    }
  }

  console.log(`\nRaces: ${summary.races}, candidates written: ${summary.candidates}, skipped (no district): ${summary.skippedNoDistrict}`)
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
