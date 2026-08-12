// © 2025 The Founded Project LLC — All rights reserved.
// scripts/apply-primary-results.js
//
// Applies primary results to candidate statuses from a reviewed JSON
// file. Election results demand accuracy over automation: the file is
// authored from official sources (state SoS, AP calls) and reviewed
// before applying — no scraping in the trust path.
//
//   node scripts/apply-primary-results.js --file results.json           # dry run
//   node scripts/apply-primary-results.js --file results.json --apply
//
// results.json shape (one entry per race with reported results):
// [
//   {
//     "race": "Arizona Senate 2026",        // exact Race.label
//     "winners": ["Ruben Gallego", "Kari Lake"],  // advancing to general
//     "eliminateOthers": true               // everyone else -> LOST_PRIMARY
//   }
// ]
// Winners are matched by "First Last" (case-insensitive). Winners get
// WON_PRIMARY; with eliminateOthers, every other non-withdrawn candidate
// in the race gets LOST_PRIMARY. Unmatched winner names abort that race
// (nothing partial), and every action logs a MonitoringChange for the
// audit trail.

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const FILE = (() => {
  const i = process.argv.indexOf('--file')
  return i !== -1 ? process.argv[i + 1] : null
})()

const norm = s => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to write ===')
  if (!FILE) throw new Error('--file results.json required')
  const entries = JSON.parse(fs.readFileSync(FILE, 'utf8'))

  let updated = 0
  for (const entry of entries) {
    const race = await prisma.race.findFirst({
      where: { label: entry.race },
      include: { candidates: true },
    })
    if (!race) {
      console.error(`✗ Race not found: "${entry.race}" — skipped`)
      continue
    }

    const byName = new Map(race.candidates.map(c => [norm(`${c.firstName} ${c.lastName}`), c]))
    const winners = []
    let abort = false
    for (const name of entry.winners) {
      const c = byName.get(norm(name))
      if (!c) {
        console.error(`✗ ${entry.race}: winner "${name}" not found among ${race.candidates.length} candidates — race skipped, nothing changed`)
        abort = true
        break
      }
      winners.push(c)
    }
    if (abort) continue

    const winnerIds = new Set(winners.map(c => c.id))
    const losers = entry.eliminateOthers
      ? race.candidates.filter(c => !winnerIds.has(c.id) && !['WITHDREW', 'LOST_PRIMARY'].includes(c.status))
      : []

    console.log(`\n${entry.race}`)
    for (const c of winners) console.log(`  WON_PRIMARY   ${c.firstName} ${c.lastName}${c.status !== 'ACTIVE' ? ` (was ${c.status})` : ''}`)
    for (const c of losers) console.log(`  LOST_PRIMARY  ${c.firstName} ${c.lastName}`)

    if (!APPLY) continue

    await prisma.$transaction(async (tx) => {
      for (const c of winners) {
        await tx.candidate.update({ where: { id: c.id }, data: { status: 'WON_PRIMARY' } })
      }
      for (const c of losers) {
        await tx.candidate.update({ where: { id: c.id }, data: { status: 'LOST_PRIMARY' } })
      }
      await tx.monitoringChange.create({
        data: {
          type: 'PRIMARY_RESULTS_IN',
          raceId: race.id,
          title: `Primary results applied: ${entry.race}`,
          description: `Advancing: ${winners.map(c => `${c.firstName} ${c.lastName}`).join(', ')}. Eliminated: ${losers.map(c => `${c.firstName} ${c.lastName}`).join(', ') || 'none'}.`,
          reviewed: true,
        },
      })
    })
    updated++
  }
  console.log(`\nRaces updated: ${APPLY ? updated : 0}${APPLY ? '' : ' (dry run)'}`)
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
