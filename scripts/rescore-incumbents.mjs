// © 2025 The Founded Project LLC — All rights reserved.
// scripts/rescore-incumbents.mjs
//
// Re-scores every candidate with a congressional record (bioguideId) so
// their positions use recorded roll-call votes (lib/roll-calls.js).
// Overwrite is per question: a failed call leaves the old answer in place.
//
//   railway run node scripts/rescore-incumbents.mjs                 # dry run
//   railway run node scripts/rescore-incumbents.mjs --apply --backup <file.json>

import { writeFileSync } from 'fs'
import { prisma } from '../lib/prisma.js'
import { extractPositionsForCandidate } from '../lib/candidate-positions.js'

const APPLY = process.argv.includes('--apply')
const backupPath = process.argv[process.argv.indexOf('--backup') + 1]

const mix = async (ids) => Object.fromEntries((await prisma.candidateAnswer.groupBy({
  by: ['evidenceType'], where: { candidateId: { in: ids } }, _count: true,
})).map((g) => [g.evidenceType, g._count]))

const candidates = await prisma.candidate.findMany({
  where: { bioguideId: { not: null }, status: { in: ['ACTIVE', 'WON_PRIMARY'] } },
  select: { id: true, firstName: true, lastName: true, bioguideId: true, race: { select: { label: true } }, _count: { select: { quizAnswers: true } } },
  orderBy: { lastName: 'asc' },
})
const ids = candidates.map((c) => c.id)
const pairs = candidates.reduce((n, c) => n + c._count.quizAnswers, 0)
console.log(`${candidates.length} candidates with a congressional record, ${pairs} existing answers`)
console.log('evidence mix before:', await mix(ids))

if (!APPLY) {
  for (const c of candidates) console.log(`  ${c.bioguideId} ${c.firstName} ${c.lastName} — ${c.race.label} (${c._count.quizAnswers})`)
  console.log('dry run; pass --apply --backup <file> to re-score')
  process.exit(0)
}
if (!backupPath || backupPath.startsWith('--')) throw new Error('--apply needs --backup <file.json>')
const before = await prisma.candidateAnswer.findMany({ where: { candidateId: { in: ids } } })
writeFileSync(backupPath, JSON.stringify(before, null, 1))
console.log(`backed up ${before.length} answers to ${backupPath}`)

let done = 0
for (const c of candidates) {
  const t = Date.now()
  try {
    const s = await extractPositionsForCandidate(c.id, { overwrite: true })
    const vr = s.details.filter((d) => d.evidenceType === 'VOTING_RECORD').length
    console.log(`[${++done}/${candidates.length}] ${c.firstName} ${c.lastName}: ${s.created} scored, ${s.failed} failed, ${vr} voting record (${Math.round((Date.now() - t) / 1000)}s)`)
  } catch (err) {
    console.error(`[${++done}/${candidates.length}] ${c.firstName} ${c.lastName}: ${err.message}`)
    if (err.isBillingError) break
  }
}
console.log('evidence mix after:', await mix(ids))
await prisma.$disconnect()
