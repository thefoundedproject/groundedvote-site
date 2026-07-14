// © 2025 The Founded Project LLC — All rights reserved.
// scripts/seed-ballot-measures.js
//
// Seeds 2026 statewide ballot measures from Wikipedia's
// "2026 United States ballot measures" page (CC BY-SA; one request,
// no crawling). Ballotpedia's MediaWiki API sits behind bot protection,
// so Wikipedia is the open, licensed source; each row keeps the
// Ballotpedia reference URL from the citation when present.
//
//   node scripts/seed-ballot-measures.js                 # dry run
//   node scripts/seed-ballot-measures.js --apply         # write rows
//   node scripts/seed-ballot-measures.js --wikitext f.json  # parse a saved
//                                                        # API response (tests)
//
// Only measures marked "On ballot" are seeded. Unparsed rows are listed
// at the end — nothing is dropped silently.

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const APPLY = process.argv.includes('--apply')
const WIKITEXT_FILE = (() => {
  const i = process.argv.indexOf('--wikitext')
  return i !== -1 ? process.argv[i + 1] : null
})()

const PAGE = '2026 United States ballot measures'
const UA = 'GroundedVote/1.0 (https://groundedvote.com; contact@groundedvote.com)'
const YEAR = 2026

const STATE_CODES = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI',
  Wyoming: 'WY',
}

/** Strip wiki markup down to plain text. */
function plain(s) {
  return s
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** First ballotpedia.org URL inside the raw (unstripped) cell markup. */
function ballotpediaUrl(raw) {
  return /https:\/\/ballotpedia\.org\/[^\s|<}\]]+/.exec(raw)?.[0] ?? null
}

/**
 * Parse the page wikitext → [{ state, title, description, sourceUrl, status }].
 * Exported for tests.
 */
function parseMeasures(wikitext) {
  const measures = []
  const unparsed = []

  // Split into state sections
  const sections = wikitext.split(/^===\s*/m).slice(1)
  for (const section of sections) {
    const headEnd = section.indexOf('===')
    const stateName = section.slice(0, headEnd).trim()
    const state = STATE_CODES[stateName]
    if (!state) continue
    const body = section.slice(headEnd + 3)

    // Rows of the first wikitable(s) in this section
    const rows = body.split(/^\|-/m).slice(1)
    for (const row of rows) {
      const cells = row
        .split(/\n\|(?!\})/)          // cells start with "|" at line start
        .slice(1)                      // first chunk is row styling
        .map(c => c.replace(/^[^|]*\|(?=[^|])/, s => (s.includes('style=') ? '' : s))) // drop style attrs
      if (cells.length < 4) continue

      // Layout: Origin | Status | Measure | Description | Date | Yes | No
      const status = plain(cells[1] ?? '')
      const title = plain(cells[2] ?? '')
      const description = plain(cells[3] ?? '')
      const sourceUrl = ballotpediaUrl(row)

      if (!title || title.length < 8) continue
      if (!/on ballot/i.test(status)) continue // certified measures only
      if (!description || description.length < 20) {
        unparsed.push({ state, title, reason: 'description missing/short' })
        continue
      }

      measures.push({
        state,
        // "Arizona Designate Drug Cartels … Measure" → drop the state prefix
        title: title.replace(new RegExp(`^${stateName}\\s+`), '').trim(),
        description,
        yesPosition: `A "yes" vote: ${description}`,
        noPosition: null,
        sourceUrl,
      })
    }
  }
  return { measures, unparsed }
}

async function fetchWikitext() {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
    action: 'parse', page: PAGE, prop: 'wikitext', format: 'json',
  })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`)
  const data = await res.json()
  const wikitext = data?.parse?.wikitext?.['*']
  if (!wikitext) throw new Error('No wikitext in response')
  return wikitext
}

async function main() {
  console.log(APPLY ? '=== APPLY MODE ===' : '=== DRY RUN — pass --apply to write ===')

  const wikitext = WIKITEXT_FILE
    ? JSON.parse(fs.readFileSync(WIKITEXT_FILE, 'utf8')).parse.wikitext['*']
    : await fetchWikitext()

  const { measures, unparsed } = parseMeasures(wikitext)

  // Limit to states we actually cover (races in DB) when a DB is reachable
  let covered = null
  const prisma = new PrismaClient()
  try {
    const rs = await prisma.race.findMany({ select: { state: true }, distinct: ['state'] })
    covered = new Set(rs.map(r => r.state))
  } catch {
    console.log('(no database reachable — showing all states)')
  }

  const inScope = covered ? measures.filter(m => covered.has(m.state)) : measures
  const byState = {}
  for (const m of inScope) (byState[m.state] ??= []).push(m)

  for (const [state, list] of Object.entries(byState).sort()) {
    console.log(`\n${state} — ${list.length} measure(s) on ballot`)
    for (const m of list) console.log(`  • ${m.title}${m.sourceUrl ? '' : ' (no Ballotpedia ref)'}`)
  }
  console.log(`\nTotal on-ballot measures parsed: ${measures.length}; in covered states: ${inScope.length}`)
  if (unparsed.length) {
    console.log(`Unparsed rows (${unparsed.length}):`)
    for (const u of unparsed) console.log(`  ${u.state} — ${u.title}: ${u.reason}`)
  }

  if (APPLY && covered) {
    let written = 0
    for (const m of inScope) {
      await prisma.ballotMeasure.upsert({
        where: { state_title_year: { state: m.state, title: m.title, year: YEAR } },
        create: { ...m, year: YEAR },
        update: { description: m.description, yesPosition: m.yesPosition, sourceUrl: m.sourceUrl },
      })
      written++
    }
    console.log(`Written: ${written}`)
  }
  await prisma.$disconnect()
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exitCode = 1 })
}
module.exports = { parseMeasures }
