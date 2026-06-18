// © 2025 The Founded Project LLC — All rights reserved.
// scripts/enrich-candidates-ballotpedia.js
// Fetches bio, photo URL, social links, and website from Ballotpedia
// for each candidate and writes them back to the database.
// Skips fields that are already populated (idempotent).
//
// Usage:
//   node scripts/enrich-candidates-ballotpedia.js
//   node scripts/enrich-candidates-ballotpedia.js --state MN
//   node scripts/enrich-candidates-ballotpedia.js --dry-run

import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const STATE_FILTER = (() => {
  const i = process.argv.indexOf('--state')
  return i !== -1 ? process.argv[i + 1] : null
})()

const DELAY_MS = 900   // polite crawl delay between requests
const UA = 'GroundedVote/1.0 (civic research; contact@groundedvote.com)'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Build the Ballotpedia wiki URL for a candidate
function buildBallotpediaUrl(firstName, lastName) {
  const name = `${firstName}_${lastName}`.replace(/\s+/g, '_')
  return `https://ballotpedia.org/${name}`
}

// Scrape a single Ballotpedia page and extract relevant fields
async function scrapeBallotpedia(url) {
  let html
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
      timeout: 12000,
    })
    if (!res.ok) return null
    html = await res.text()
  } catch (e) {
    console.warn(`  fetch error for ${url}: ${e.message}`)
    return null
  }

  const result = {}

  // Bio: first paragraph of the #mw-content-text .mw-parser-output > p
  const bioMatch = html.match(/<div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/)
  if (bioMatch) {
    // Strip HTML tags and decode basic entities
    const raw = bioMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ').trim()
    if (raw.length > 40) result.bio = raw.slice(0, 1200)
  }

  // Photo: og:image meta tag
  const ogImgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
  if (ogImgMatch) result.imageUrl = ogImgMatch[1]

  // Website: official website link in infobox
  const websiteMatch = html.match(/Official website[^"]*"[^>]*href="([^"]+)"/)
    || html.match(/href="(https?:\/\/(?!ballotpedia)[^"]+)"[^>]*>(?:Official|Campaign) (?:site|website|page)/i)
  if (websiteMatch) result.website = websiteMatch[1]

  // Twitter/X
  const twitterMatch = html.match(/href="(https?:\/\/(?:twitter|x)\.com\/[A-Za-z0-9_]+)"/)
  if (twitterMatch) result.twitterUrl = twitterMatch[1]

  return Object.keys(result).length > 0 ? result : null
}

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No writes will occur.\n' : '')
  if (STATE_FILTER) console.log(`Filtering to state: ${STATE_FILTER}\n`)

  const where = STATE_FILTER
    ? { race: { state: STATE_FILTER } }
    : {}

  const candidates = await prisma.candidate.findMany({
    where,
    include: { race: { select: { state: true, label: true } } },
    orderBy: [{ race: { state: 'asc' } }, { lastName: 'asc' }],
  })

  console.log(`Processing ${candidates.length} candidates...\n`)
  let enriched = 0, skipped = 0, failed = 0

  for (const c of candidates) {
    const name = `${c.firstName} ${c.lastName}`
    const alreadyComplete = c.bio && c.ballotpediaUrl && c.imageUrl

    if (alreadyComplete) {
      console.log(`[skip] ${name} — already fully enriched`)
      skipped++
      continue
    }

    const url = c.ballotpediaUrl || buildBallotpediaUrl(c.firstName, c.lastName)
    console.log(`[fetch] ${name} (${c.race?.state}) — ${url}`)

    const data = await scrapeBallotpedia(url)

    if (!data) {
      console.log(`  → no data found`)
      failed++
    } else {
      const updates = {}
      if (data.bio && !c.bio)               updates.bio = data.bio
      if (data.imageUrl && !c.imageUrl)     updates.imageUrl = data.imageUrl
      if (data.website && !c.website)       updates.website = data.website
      if (data.twitterUrl && !c.twitterUrl) updates.twitterUrl = data.twitterUrl
      if (!c.ballotpediaUrl)                updates.ballotpediaUrl = url

      const fields = Object.keys(updates).join(', ')
      if (fields) {
        console.log(`  → updating: ${fields}`)
        if (!DRY_RUN) {
          await prisma.candidate.update({ where: { id: c.id }, data: updates })
        }
        enriched++
      } else {
        console.log(`  → nothing new to add`)
        skipped++
      }
    }

    await sleep(DELAY_MS)
  }

  console.log(`\n── Summary ──`)
  console.log(`Enriched: ${enriched}  Skipped: ${skipped}  Failed: ${failed}`)
  if (DRY_RUN) console.log('[DRY RUN] No changes written to database.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
