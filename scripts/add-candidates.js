// © 2025 The Founded Project LLC — All rights reserved.
// scripts/add-candidates.js
//
// Adds candidates from a reviewed JSON file (e.g. primary nominees who
// were never seeded). Idempotent: existing name+race pairs are skipped.
//
//   node scripts/add-candidates.js --file candidates.json           # dry run
//   node scripts/add-candidates.js --file candidates.json --apply
//
// File shape: [{ "race": "<Race.label>", "name": "First Last",
//                "party": "D" | "R" | "I" | "flip" | "Unknown" }]
// "flip": infer the opposite major party from the race's other
// still-standing major-party candidate (D<->R); falls back to Unknown.

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const FILE = (() => { const i = process.argv.indexOf('--file'); return i !== -1 ? process.argv[i + 1] : null })()

const norm = s => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
const splitName = name => {
  const parts = name.trim().split(/\s+/)
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) }
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to write ===')
  const entries = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  let added = 0, skipped = 0

  for (const e of entries) {
    const race = await prisma.race.findFirst({ where: { label: e.race }, include: { candidates: true } })
    if (!race) { console.error(`✗ race not found: ${e.race}`); continue }

    const exists = race.candidates.some(c => norm(`${c.firstName} ${c.lastName}`) === norm(e.name))
    if (exists) { console.log(`  = ${e.race}: ${e.name} already present`); skipped++; continue }

    let party = e.party
    if (party === 'flip') {
      const standing = race.candidates.filter(c => !['LOST_PRIMARY', 'WITHDREW'].includes(c.status))
      const majors = new Set(standing.map(c => c.party).filter(p => p === 'D' || p === 'R'))
      party = majors.size === 1 ? (majors.has('D') ? 'R' : 'D') : 'Unknown'
    }

    const { firstName, lastName } = splitName(e.name)
    console.log(`  + ${e.race}: ${firstName} ${lastName} (${party})`)
    if (APPLY) {
      await prisma.candidate.create({
        data: { raceId: race.id, firstName, lastName, party, status: 'ACTIVE' },
      })
      added++
    }
  }
  console.log(`\nAdded: ${APPLY ? added : 0}, already present: ${skipped}`)
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
