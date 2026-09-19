// © 2025 The Founded Project LLC — All rights reserved.
// scripts/apply-state-matchups.js
//
// Brings state-legislature races to their 2026 general-election matchup
// from a reviewed JSON file (same trust rule as primary results: authored
// from a reviewed source, never scraped in the trust path).
//
//   node scripts/apply-state-matchups.js --file data/mn-house-matchups-2026.json          # dry run
//   node scripts/apply-state-matchups.js --file data/mn-house-matchups-2026.json --apply
//
// File shape: { races: [{ race: "<Race.label>", candidates: [{ name, party }] }] }
// For each race: candidates in the list are added if missing (ACTIVE);
// existing candidates NOT in the list are set to WITHDREW (the OpenStates
// seed added sitting incumbents, some of whom are not running). Matching
// is loose on middle names/initials/nicknames so "Zachary \"Zach\" Dorholt"
// matches a seeded "Zach Dorholt". Every change logs a MonitoringChange.

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const FILE = (() => { const i = process.argv.indexOf('--file'); return i !== -1 ? process.argv[i + 1] : null })()

const norm = s => s.toLowerCase().replace(/["“”'’().]/g, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
// Loose match: same last token (surname) and any shared given-name token,
// or one full name contains the other.
const samePerson = (a, b) => {
  const na = norm(a), nb = norm(b)
  if (na === nb || na.includes(nb) || nb.includes(na)) return true
  const ta = na.split(' '), tb = nb.split(' ')
  if (ta.at(-1) !== tb.at(-1)) return false
  // Given names match on equality, initial, or prefix (Jess ~ Jessica)
  return ta.slice(0, -1).some(x => tb.slice(0, -1).some(y =>
    x === y
    || (x[0] === y[0] && (x.length === 1 || y.length === 1))
    || (x.length >= 3 && y.length >= 3 && (x.startsWith(y) || y.startsWith(x)))
  ))
}
// Nicknames the loose matcher cannot derive ("Ripper" for Aaron) are
// declared per-candidate in the data file: { name, party, aka: [...] }
const matchesListed = (dbName, listed) =>
  samePerson(dbName, listed.name) || (listed.aka ?? []).some(a => samePerson(dbName, a))
const splitName = name => {
  const parts = name.replace(/["“”].*?["“”]\s*/g, '').replace(/\([^)]*\)\s*/g, '').trim().split(/\s+/)
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) }
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to write ===')
  const { races } = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  let added = 0, withdrew = 0, kept = 0

  for (const entry of races) {
    const race = await prisma.race.findFirst({ where: { label: entry.race }, include: { candidates: true } })
    if (!race) { console.error(`✗ race not found: ${entry.race}`); continue }

    const matches = []   // [listed, dbCandidate|null]
    for (const listed of entry.candidates) {
      const db = race.candidates.find(c => matchesListed(`${c.firstName} ${c.lastName}`, listed))
      matches.push([listed, db ?? null])
    }
    const matchedIds = new Set(matches.map(([, db]) => db?.id).filter(Boolean))
    const toWithdraw = race.candidates.filter(c => !matchedIds.has(c.id) && !['WITHDREW', 'LOST_PRIMARY'].includes(c.status))

    console.log(`\n${entry.race}`)
    const ops = []
    for (const [listed, db] of matches) {
      if (db) {
        console.log(`  KEEP     ${db.firstName} ${db.lastName} (${db.party})${norm(listed.name) !== norm(`${db.firstName} ${db.lastName}`) ? `  [matched "${listed.name}"]` : ''}`)
        kept++
      } else {
        const { firstName, lastName } = splitName(listed.name)
        console.log(`  ADD      ${firstName} ${lastName} (${listed.party})`)
        added++
        ops.push({ add: { raceId: race.id, firstName, lastName, party: listed.party, status: 'ACTIVE' } })
      }
    }
    for (const c of toWithdraw) {
      console.log(`  WITHDREW ${c.firstName} ${c.lastName} (not on the 2026 general ballot)`)
      withdrew++
      ops.push({ withdraw: c })
    }

    if (!APPLY) continue
    await prisma.$transaction(async (tx) => {
      for (const op of ops) {
        if (op.add) await tx.candidate.create({ data: op.add })
        if (op.withdraw) await tx.candidate.update({ where: { id: op.withdraw.id }, data: { status: 'WITHDREW' } })
      }
      await tx.monitoringChange.create({
        data: {
          type: 'NEW_CANDIDATE_FILED',
          raceId: race.id,
          title: `2026 general-election matchup applied: ${entry.race}`,
          description: `On ballot: ${entry.candidates.map(c => `${c.name} (${c.party})`).join(', ')}. Withdrawn/not running: ${toWithdraw.map(c => `${c.firstName} ${c.lastName}`).join(', ') || 'none'}.`,
          reviewed: true,
        },
      })
    })
  }
  console.log(`\nKept: ${kept} · added: ${APPLY ? added : added + ' (dry)'} · withdrew: ${APPLY ? withdrew : withdrew + ' (dry)'}`)
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
