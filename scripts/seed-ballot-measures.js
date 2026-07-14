// © 2025 The Founded Project LLC — All rights reserved.
// scripts/seed-ballot-measures.js
//
// Seeds 2026 statewide ballot measures from Ballotpedia's public
// MediaWiki API for every state that has races in the database.
//
//   node scripts/seed-ballot-measures.js            # dry run (report only)
//   node scripts/seed-ballot-measures.js --apply    # write BallotMeasure rows
//   node scripts/seed-ballot-measures.js --state AZ # limit to one state
//
// How it reads Ballotpedia:
//   1. "<State> 2026 ballot measures" list page → wikitext → measure links
//   2. Each measure page → plain-text extract → description + the standard
//      'A "yes" vote supports…' / 'A "no" vote opposes…' sentences
// Measures whose pages can't be parsed are listed at the end — nothing
// is dropped silently.

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const STATE_FILTER = (() => {
  const i = process.argv.indexOf('--state')
  return i !== -1 ? process.argv[i + 1]?.toUpperCase() : null
})()

const API = 'https://ballotpedia.org/w/api.php'
const UA = 'GroundedVote/1.0 (civic research; contact@groundedvote.com)'
const DELAY_MS = 900
const YEAR = 2026

const STATE_NAMES = {
  AZ: 'Arizona', CA: 'California', CO: 'Colorado', GA: 'Georgia', IA: 'Iowa',
  ME: 'Maine', MI: 'Michigan', MN: 'Minnesota', MT: 'Montana', NC: 'North Carolina',
  NH: 'New Hampshire', NM: 'New Mexico', NV: 'Nevada', NY: 'New York', OH: 'Ohio',
  OR: 'Oregon', PA: 'Pennsylvania', TX: 'Texas', VA: 'Virginia', WA: 'Washington',
  WI: 'Wisconsin',
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function wiki(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Ballotpedia ${res.status} for ${params.page ?? params.titles}`)
  return res.json()
}

/** Measure page titles linked from the state's list page. */
async function listMeasureTitles(stateName) {
  const data = await wiki({ action: 'parse', page: `${stateName} ${YEAR} ballot measures`, prop: 'wikitext' })
  const wikitext = data?.parse?.wikitext?.['*']
  if (!wikitext) return []
  // Links like [[Arizona Proposition 139, Right to ... Amendment (2026)|...]]
  const links = [...wikitext.matchAll(/\[\[([^\]|#]+\(2026\))(?:\|[^\]]*)?\]\]/g)].map(m => m[1].trim())
  // Keep pages that look like measures for this state, drop list/overview pages
  const unique = [...new Set(links)].filter(t =>
    t.startsWith(stateName) && !/ballot measures|elections|overview/i.test(t)
  )
  return unique
}

/** Plain-text extract for a measure page → { description, yes, no }. */
async function measureDetail(pageTitle) {
  const data = await wiki({
    action: 'query', titles: pageTitle, prop: 'extracts',
    explaintext: 'true', exsectionformat: 'plain', exchars: '2400',
  })
  const pages = data?.query?.pages
  const page = pages ? Object.values(pages)[0] : null
  const text = page?.extract ?? ''
  if (text.length < 80) return null

  const yes = /A\s+"?yes"?\s+vote\s+([^.]{10,400}\.)/i.exec(text)?.[0] ?? null
  const no = /A\s+"?no"?\s+vote\s+([^.]{10,400}\.)/i.exec(text)?.[0] ?? null
  // Description: first paragraph before the yes/no boilerplate
  const cut = text.search(/A\s+"?yes"?\s+vote/i)
  const description = (cut > 80 ? text.slice(0, cut) : text.slice(0, 800)).trim()

  return { description, yes, no }
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to write ===')

  const raceStates = await prisma.race.findMany({ select: { state: true }, distinct: ['state'] })
  let states = raceStates.map(r => r.state).filter(s => STATE_NAMES[s]).sort()
  if (STATE_FILTER) states = states.filter(s => s === STATE_FILTER)
  console.log(`States: ${states.join(', ')}`)

  const failures = []
  let found = 0
  let written = 0

  for (const state of states) {
    const stateName = STATE_NAMES[state]
    let titles = []
    try {
      titles = await listMeasureTitles(stateName)
    } catch (err) {
      failures.push({ state, stage: 'list', error: err.message })
      continue
    }
    console.log(`\n${state} — ${titles.length} measure page(s) linked`)
    await sleep(DELAY_MS)

    for (const title of titles) {
      let detail = null
      try {
        detail = await measureDetail(title)
      } catch (err) {
        failures.push({ state, stage: 'detail', title, error: err.message })
      }
      await sleep(DELAY_MS)
      if (!detail) {
        failures.push({ state, stage: 'parse', title, error: 'extract too short or missing' })
        continue
      }

      // Display title: "Proposition 139" out of the full page title
      const short = title.replace(`${stateName} `, '').replace(/ \(2026\)$/, '').split(',')[0].trim()
      found++
      console.log(`  • ${short}${detail.yes ? ' (yes/no parsed)' : ' (yes/no missing)'}`)

      if (APPLY) {
        await prisma.ballotMeasure.upsert({
          where: { state_title_year: { state, title: short, year: YEAR } },
          create: {
            state,
            title: short,
            description: detail.description,
            yesPosition: detail.yes,
            noPosition: detail.no,
            year: YEAR,
            sourceUrl: `https://ballotpedia.org/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
          },
          update: {
            description: detail.description,
            yesPosition: detail.yes,
            noPosition: detail.no,
            sourceUrl: `https://ballotpedia.org/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
          },
        })
        written++
      }
    }
  }

  console.log(`\nMeasures parsed: ${found}${APPLY ? `, written: ${written}` : ''}`)
  if (failures.length) {
    console.log(`\nNot parsed (${failures.length}) — review by hand, nothing dropped silently:`)
    for (const f of failures) console.log(`  ${f.state} [${f.stage}] ${f.title ?? ''} — ${f.error}`)
  }
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
