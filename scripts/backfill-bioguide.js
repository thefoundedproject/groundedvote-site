// © 2025 The Founded Project LLC — All rights reserved.
// scripts/backfill-bioguide.js
//
// Sets bioguideId for primary nominees who are sitting (or former)
// members of Congress — verified against Congress.gov before writing,
// never from memory: a wrong bioguide attaches someone else's voting
// record to a candidate.
//
//   node scripts/backfill-bioguide.js            # dry run
//   node scripts/backfill-bioguide.js --apply

const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const KEY = process.env.CONGRESS_API_KEY
const APPLY = process.argv.includes('--apply')

// Same-district House nominees: ask Congress.gov who holds the seat now
// and require a last-name match. Collins holds GA-10 while running for
// Senate, so his lookup targets that seat (incumbent stays false).
const DISTRICT_LOOKUPS = [
  { race: 'New York House District 3 2026', state: 'NY', district: 3, lastName: 'Suozzi', incumbent: true },
  { race: 'New York House District 17 2026', state: 'NY', district: 17, lastName: 'Lawler', incumbent: true },
  { race: 'New York House District 18 2026', state: 'NY', district: 18, lastName: 'Ryan', incumbent: true },
  { race: 'Virginia House District 2 2026', state: 'VA', district: 2, lastName: 'Kiggans', incumbent: true },
  { race: 'Iowa House District 3 2026', state: 'IA', district: 3, lastName: 'Nunn', incumbent: true },
  { race: 'Georgia House District 7 2026', state: 'GA', district: 7, lastName: 'McCormick', incumbent: true },
  { race: 'Georgia Senate 2026', state: 'GA', district: 10, lastName: 'Collins', incumbent: false },
]
// Former member: verify the specific bioguide record by name and state.
const DIRECT = [
  { race: 'Michigan Senate 2026', lastName: 'Rogers', bioguide: 'R000572', expectState: 'Michigan' },
]

async function cg(path) {
  const res = await fetch(`https://api.congress.gov/v3/${path}?api_key=${KEY}`)
  return res.ok ? res.json() : null
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to write ===')

  for (const l of DISTRICT_LOOKUPS) {
    const d = await cg(`member/congress/119/${l.state}/${l.district}`)
    const m = (d?.members ?? []).find(mm => (mm.name ?? '').includes(l.lastName))
    if (!m) { console.log(`SKIP ${l.race}: no current ${l.state}-${l.district} member named ${l.lastName}`); continue }
    const cand = await p.candidate.findFirst({ where: { lastName: l.lastName, race: { label: l.race } } })
    if (!cand) { console.log(`SKIP ${l.race}: ${l.lastName} not in DB`); continue }
    console.log(`SET  ${l.race}: ${l.lastName} -> ${m.bioguideId} (${m.name})`)
    if (APPLY) {
      await p.candidate.update({ where: { id: cand.id }, data: { bioguideId: m.bioguideId, incumbent: l.incumbent } })
    }
    await new Promise(r => setTimeout(r, 400))
  }

  for (const l of DIRECT) {
    const d = await cg(`member/${l.bioguide}`)
    const name = d?.member?.directOrderName ?? d?.member?.invertedOrderName ?? ''
    const ok = name.includes(l.lastName) && d?.member?.state === l.expectState
    if (!ok) { console.log(`SKIP ${l.race}: ${l.bioguide} did not verify as ${l.lastName}/${l.expectState} (got: ${name}, ${d?.member?.state})`); continue }
    const cand = await p.candidate.findFirst({ where: { lastName: l.lastName, race: { label: l.race } } })
    if (!cand) { console.log(`SKIP ${l.race}: ${l.lastName} not in DB`); continue }
    console.log(`SET  ${l.race}: ${l.lastName} -> ${l.bioguide} (${name}, former member)`)
    if (APPLY) await p.candidate.update({ where: { id: cand.id }, data: { bioguideId: l.bioguide } })
  }
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => p.$disconnect())
