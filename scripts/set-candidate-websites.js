// © 2025 The Founded Project LLC — All rights reserved.
// scripts/set-candidate-websites.js
//
// Sets Candidate.website from a reviewed JSON file (state filing lists,
// FEC filings — official sources only; never discovered URLs). The
// campaign-site extractor (lib/campaign-site.js) only reads sites stored
// here, so what feeds the evidence pipeline is always reviewable.
//
//   node scripts/set-candidate-websites.js --file data/websites.json          # dry run
//   node scripts/set-candidate-websites.js --file data/websites.json --apply
//
// File shape: { sites: [{ race: "<Race.label>", name: "First Last", website: "..." }] }
// Existing non-null websites are only overwritten with --overwrite.

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const OVERWRITE = process.argv.includes('--overwrite')
const FILE = (() => { const i = process.argv.indexOf('--file'); return i !== -1 ? process.argv[i + 1] : null })()

const norm = s => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
const samePerson = (a, b) => {
  const na = norm(a), nb = norm(b)
  if (na === nb || na.includes(nb) || nb.includes(na)) return true
  const ta = na.split(' '), tb = nb.split(' ')
  if (ta.at(-1) !== tb.at(-1)) return false
  return ta.slice(0, -1).some(x => tb.slice(0, -1).some(y =>
    x === y || (x[0] === y[0] && (x.length === 1 || y.length === 1))
    || (x.length >= 3 && y.length >= 3 && (x.startsWith(y) || y.startsWith(x)))))
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to write ===')
  const { sites } = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  let set = 0, kept = 0, missing = 0

  for (const s of sites) {
    const race = await prisma.race.findFirst({ where: { label: s.race }, include: { candidates: true } })
    if (!race) { console.error(`✗ race not found: ${s.race}`); missing++; continue }
    const c = race.candidates.find(c => samePerson(`${c.firstName} ${c.lastName}`, s.name))
    if (!c) { console.error(`✗ ${s.race}: candidate not found: ${s.name}`); missing++; continue }
    if (c.website && !OVERWRITE) { console.log(`  = ${c.firstName} ${c.lastName}: keeps ${c.website}`); kept++; continue }
    console.log(`  SET ${c.firstName} ${c.lastName} -> ${s.website}`)
    set++
    if (APPLY) await prisma.candidate.update({ where: { id: c.id }, data: { website: s.website } })
  }
  console.log(`\nSet: ${APPLY ? set : set + ' (dry)'} · kept existing: ${kept} · not found: ${missing}`)
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
