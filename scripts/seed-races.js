/**
 * Seed the key 2026 competitive races into the database.
 * Run with: npm run seed:races
 *
 * CommonJS format — runs with plain Node.js (no type:module needed)
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const KEY_2026_RACES = [
  // SENATE — Competitive seats
  { state: 'AZ', stateFull: 'Arizona',       chamber: 'SENATE', district: null, label: 'Arizona Senate 2026' },
  { state: 'GA', stateFull: 'Georgia',        chamber: 'SENATE', district: null, label: 'Georgia Senate 2026' },
  { state: 'MI', stateFull: 'Michigan',       chamber: 'SENATE', district: null, label: 'Michigan Senate 2026' },
  { state: 'MN', stateFull: 'Minnesota',      chamber: 'SENATE', district: null, label: 'Minnesota Senate 2026' },
  { state: 'MT', stateFull: 'Montana',        chamber: 'SENATE', district: null, label: 'Montana Senate 2026' },
  { state: 'NC', stateFull: 'North Carolina', chamber: 'SENATE', district: null, label: 'North Carolina Senate 2026' },
  { state: 'NH', stateFull: 'New Hampshire',  chamber: 'SENATE', district: null, label: 'New Hampshire Senate 2026' },
  { state: 'NV', stateFull: 'Nevada',         chamber: 'SENATE', district: null, label: 'Nevada Senate 2026' },
  { state: 'OH', stateFull: 'Ohio',           chamber: 'SENATE', district: null, label: 'Ohio Senate 2026' },
  { state: 'PA', stateFull: 'Pennsylvania',   chamber: 'SENATE', district: null, label: 'Pennsylvania Senate 2026' },
  { state: 'TX', stateFull: 'Texas',          chamber: 'SENATE', district: null, label: 'Texas Senate 2026' },
  { state: 'WI', stateFull: 'Wisconsin',      chamber: 'SENATE', district: null, label: 'Wisconsin Senate 2026' },
  // HOUSE — Key competitive districts
  { state: 'AZ', stateFull: 'Arizona',        chamber: 'HOUSE', district: '1',  label: 'Arizona House District 1 2026' },
  { state: 'AZ', stateFull: 'Arizona',        chamber: 'HOUSE', district: '6',  label: 'Arizona House District 6 2026' },
  { state: 'CA', stateFull: 'California',     chamber: 'HOUSE', district: '13', label: 'California House District 13 2026' },
  { state: 'CA', stateFull: 'California',     chamber: 'HOUSE', district: '27', label: 'California House District 27 2026' },
  { state: 'CO', stateFull: 'Colorado',       chamber: 'HOUSE', district: '8',  label: 'Colorado House District 8 2026' },
  { state: 'GA', stateFull: 'Georgia',        chamber: 'HOUSE', district: '7',  label: 'Georgia House District 7 2026' },
  { state: 'IA', stateFull: 'Iowa',           chamber: 'HOUSE', district: '3',  label: 'Iowa House District 3 2026' },
  { state: 'ME', stateFull: 'Maine',          chamber: 'HOUSE', district: '2',  label: 'Maine House District 2 2026' },
  { state: 'MI', stateFull: 'Michigan',       chamber: 'HOUSE', district: '7',  label: 'Michigan House District 7 2026' },
  { state: 'MI', stateFull: 'Michigan',       chamber: 'HOUSE', district: '8',  label: 'Michigan House District 8 2026' },
  { state: 'MN', stateFull: 'Minnesota',      chamber: 'HOUSE', district: '2',  label: 'Minnesota House District 2 2026' },
  { state: 'NM', stateFull: 'New Mexico',     chamber: 'HOUSE', district: '2',  label: 'New Mexico House District 2 2026' },
  { state: 'NY', stateFull: 'New York',       chamber: 'HOUSE', district: '3',  label: 'New York House District 3 2026' },
  { state: 'NY', stateFull: 'New York',       chamber: 'HOUSE', district: '4',  label: 'New York House District 4 2026' },
  { state: 'NY', stateFull: 'New York',       chamber: 'HOUSE', district: '17', label: 'New York House District 17 2026' },
  { state: 'NY', stateFull: 'New York',       chamber: 'HOUSE', district: '18', label: 'New York House District 18 2026' },
  { state: 'OR', stateFull: 'Oregon',         chamber: 'HOUSE', district: '5',  label: 'Oregon House District 5 2026' },
  { state: 'PA', stateFull: 'Pennsylvania',   chamber: 'HOUSE', district: '7',  label: 'Pennsylvania House District 7 2026' },
  { state: 'PA', stateFull: 'Pennsylvania',   chamber: 'HOUSE', district: '8',  label: 'Pennsylvania House District 8 2026' },
  { state: 'TX', stateFull: 'Texas',          chamber: 'HOUSE', district: '28', label: 'Texas House District 28 2026' },
  { state: 'VA', stateFull: 'Virginia',       chamber: 'HOUSE', district: '2',  label: 'Virginia House District 2 2026' },
  { state: 'VA', stateFull: 'Virginia',       chamber: 'HOUSE', district: '7',  label: 'Virginia House District 7 2026' },
  { state: 'WA', stateFull: 'Washington',     chamber: 'HOUSE', district: '3',  label: 'Washington House District 3 2026' },
  { state: 'WI', stateFull: 'Wisconsin',      chamber: 'HOUSE', district: '3',  label: 'Wisconsin House District 3 2026' },
]

async function main() {
  console.log('Seeding 2026 competitive races...')

  for (const race of KEY_2026_RACES) {
    const existing = await prisma.race.findFirst({
      where: {
        state: race.state,
        chamber: race.chamber,
        district: race.district ?? null,
        year: 2026,
      },
    })

    if (existing) {
      console.log(`  ✓ Already exists: ${race.label}`)
      continue
    }

    await prisma.race.create({
      data: {
        state: race.state,
        stateFull: race.stateFull,
        chamber: race.chamber,
        district: race.district ?? null,
        year: 2026,
        label: race.label,
        isCompetitive: true,
      },
    })
    console.log(`  + Created: ${race.label}`)
  }

  const count = await prisma.race.count()
  console.log(`\nDone. ${count} total races in database.`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
