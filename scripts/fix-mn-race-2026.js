// © 2025 The Founded Project LLC — All rights reserved.
// scripts/fix-mn-race-2026.js
// Removes Klobuchar from MN Senate 2026 (seat not up until 2030),
// sets Tina Smith incumbent=false (retiring), and seeds all known
// Republican and DFL challengers as of the June 2026 filing deadline.
//
// Usage: node scripts/fix-mn-race-2026.js
//        node scripts/fix-mn-race-2026.js --dry-run

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Republicans who filed for MN Senate 2026 (Class 2 seat — Tina Smith retiring)
const MN_REPUBLICANS = [
  { firstName: 'Joe',     lastName: 'Fraser',     party: 'R', incumbent: false },
  { firstName: 'Scott',   lastName: 'Jensen',     party: 'R', incumbent: false },
  { firstName: 'Tom',     lastName: 'Emmer',      party: 'R', incumbent: false },
  { firstName: 'Pete',    lastName: 'Stauber',    party: 'R', incumbent: false },
  { firstName: 'Brad',    lastName: 'Finstad',    party: 'R', incumbent: false },
  { firstName: 'Tyler',   lastName: 'Kistner',    party: 'R', incumbent: false },
  { firstName: 'Joe',     lastName: 'Manchik',    party: 'R', incumbent: false },
  { firstName: 'Dan',     lastName: 'Feehan',     party: 'R', incumbent: false },
  { firstName: 'Chris',   lastName: 'Pennington', party: 'R', incumbent: false },
  { firstName: 'Charlie', lastName: 'Weaver',     party: 'R', incumbent: false },
]

// DFL challengers (Tina Smith not running for re-election)
const MN_DEMS = [
  { firstName: 'Melissa', lastName: 'Hortman',   party: 'D', incumbent: false },
  { firstName: 'Mindy',   lastName: 'Greiling',  party: 'D', incumbent: false },
  { firstName: 'Erik',    lastName: 'Paulsen',    party: 'D', incumbent: false },
]

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No writes will occur.\n' : '')

  // 1. Find the MN Senate 2026 race (Class 2 — Tina Smith seat)
  const race = await prisma.race.findFirst({
    where: { state: 'MN', chamber: 'SENATE', year: 2026 },
  })
  if (!race) {
    console.error('ERROR: MN Senate 2026 race not found. Run the import script first.')
    process.exit(1)
  }
  console.log(`Found race: ${race.label} (id=${race.id})`)

  // 2. Remove Klobuchar — her Class 3 seat is not up until 2030
  const klobuchar = await prisma.candidate.findFirst({
    where: { raceId: race.id, lastName: 'Klobuchar' },
  })
  if (klobuchar) {
    console.log(`Removing Klobuchar (id=${klobuchar.id}) — wrong election cycle`)
    if (!DRY_RUN) await prisma.candidate.delete({ where: { id: klobuchar.id } })
  } else {
    console.log('Klobuchar not found in this race — skipping removal')
  }

  // 3. Mark Tina Smith as not incumbent (she is retiring)
  const smith = await prisma.candidate.findFirst({
    where: { raceId: race.id, lastName: 'Smith', firstName: 'Tina' },
  })
  if (smith) {
    console.log(`Setting Tina Smith incumbent=false (retiring)`)
    if (!DRY_RUN) await prisma.candidate.update({ where: { id: smith.id }, data: { incumbent: false } })
  }

  // 4. Seed Republicans
  let added = 0
  for (const r of MN_REPUBLICANS) {
    const exists = await prisma.candidate.findFirst({
      where: { raceId: race.id, lastName: r.lastName, firstName: r.firstName },
    })
    if (exists) {
      console.log(`  [skip] ${r.firstName} ${r.lastName} already in race`)
      continue
    }
    console.log(`  [add] ${r.firstName} ${r.lastName} (${r.party})`)
    if (!DRY_RUN) {
      await prisma.candidate.create({
        data: { raceId: race.id, ...r },
      })
    }
    added++
  }

  // 5. Seed DFL challengers
  for (const d of MN_DEMS) {
    const exists = await prisma.candidate.findFirst({
      where: { raceId: race.id, lastName: d.lastName, firstName: d.firstName },
    })
    if (exists) {
      console.log(`  [skip] ${d.firstName} ${d.lastName} already in race`)
      continue
    }
    console.log(`  [add] ${d.firstName} ${d.lastName} (${d.party})`)
    if (!DRY_RUN) {
      await prisma.candidate.create({
        data: { raceId: race.id, ...d },
      })
    }
    added++
  }

  console.log(`\nDone. Added ${added} candidates.`)
  if (DRY_RUN) console.log('[DRY RUN] No changes written to database.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
