// © 2025 The Founded Project LLC — All rights reserved.
// scripts/fec-websites.mjs
//
// Builds a reviewable website file for federal nominees from their FEC
// filings: the principal campaign committee's Form 1 lists the campaign's
// own website. Read-only toward the database. The output is the input of
// scripts/set-candidate-websites.js, so a person reviews it before it
// feeds the evidence pipeline (lib/campaign-site.js).
//
// A match needs the FEC candidate's last name, state, office, district
// (House) and a 2026 candidacy; anything else is listed for review and
// left out of the file.
//
//   railway run node scripts/fec-websites.mjs --out data/fec-websites-2026.json
//
// Uses the api.data.gov key (CONGRESS_API_KEY works for OpenFEC).

import { writeFileSync } from 'fs'
import { prisma } from '../lib/prisma.js'

const KEY = process.env.FEC_API_KEY || process.env.CONGRESS_API_KEY
const OUT = process.argv[process.argv.indexOf('--out') + 1]
if (!KEY) throw new Error('FEC_API_KEY or CONGRESS_API_KEY required')
if (!OUT || OUT.startsWith('--')) throw new Error('--out <file.json> required')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function fec(path, params = {}) {
  const qs = new URLSearchParams({ ...params, api_key: KEY })
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(1100) // stay under the per-minute limit
    const res = await fetch(`https://api.open.fec.gov/v1${path}?${qs}`)
    if (res.status === 429) { await sleep(30_000); continue }
    if (!res.ok) throw new Error(`FEC ${path}: HTTP ${res.status}`)
    return res.json()
  }
  throw new Error(`FEC ${path}: rate limited`)
}

const norm = (s) => String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim()
// FEC names read "LAST, FIRST MIDDLE". Within one state, office and
// district a shared last name is specific enough on its own; first names
// (nicknames differ: Mike/Michael, Tom/Thomas) only break ties.
const sameLast = (fecName, last) => norm(String(fecName).split(',')[0]).split(' ').includes(norm(last).split(' ').at(-1))
function sameFirst(fecName, first) {
  const given = norm(String(fecName).split(',')[1] ?? '').split(' ').filter(Boolean)
  const b = norm(first).split(' ')[0] ?? ''
  return given.some((a) => a.startsWith(b.slice(0, 3)) || b.startsWith(a.slice(0, 3)))
}
function cleanUrl(u) {
  if (!u) return null
  let s = String(u).trim().toLowerCase()
  if (!s || /^(n\/?a|none)$/.test(s)) return null
  if (!/^https?:\/\//.test(s)) s = `https://${s}`
  try { const url = new URL(s); return `https://${url.host}${url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')}` } catch { return null }
}

const candidates = await prisma.candidate.findMany({
  where: { status: { in: ['ACTIVE', 'WON_PRIMARY'] }, race: { level: { not: 'STATE' } } },
  select: { firstName: true, lastName: true, party: true, website: true, race: { select: { label: true, state: true, chamber: true, district: true } } },
  orderBy: [{ race: { label: 'asc' } }, { lastName: 'asc' }],
})

const sites = [], review = []
for (const c of candidates) {
  const office = c.race.chamber === 'SENATE' ? 'S' : 'H'
  const params = { name: c.lastName, state: c.race.state, office, election_year: '2026', per_page: '20' }
  if (office === 'H' && c.race.district != null) params.district = String(c.race.district).padStart(2, '0')
  const who = `${c.firstName} ${c.lastName} (${c.race.label})`
  try {
    const { results } = await fec('/candidates/search/', params)
    let hits = results.filter((r) => sameLast(r.name, c.lastName))
    if (hits.length > 1) hits = hits.filter((r) => sameFirst(r.name, c.firstName))
    if (hits.length !== 1) { review.push(`${who}: ${hits.length} FEC matches of ${results.length} results${hits.length ? ' — ' + hits.map((h) => `${h.candidate_id} ${h.name}`).join('; ') : ''}`); continue }
    const hit = hits[0]
    const principal = (hit.principal_committees ?? []).find((p) => p.designation === 'P') ?? hit.principal_committees?.[0]
    if (!principal) { review.push(`${who}: ${hit.candidate_id} has no principal committee`); continue }
    const { results: [committee] } = await fec(`/committee/${principal.committee_id}/`)
    const website = cleanUrl(committee?.website)
    if (!website) { review.push(`${who}: ${hit.candidate_id} / ${principal.committee_id} filed no website`); continue }
    sites.push({ race: c.race.label, name: `${c.firstName} ${c.lastName}`, website, fecCandidateId: hit.candidate_id, committeeId: principal.committee_id, committeeName: committee.name })
    console.log(`  ${who} -> ${website}  [${hit.candidate_id} ${committee.name}]`)
  } catch (err) {
    review.push(`${who}: ${err.message}`)
  }
}

writeFileSync(OUT, JSON.stringify({
  _source: `FEC principal campaign committee filings (Form 1 website field), OpenFEC API, fetched ${new Date().toISOString().slice(0, 10)}. Matched on last name, state, office, district and 2026 candidacy. Review before applying.`,
  _needsReview: review,
  sites,
}, null, 2) + '\n')
console.log(`\n${sites.length} sites written to ${OUT}; ${review.length} need review:`)
for (const r of review) console.log(`  ? ${r}`)
await prisma.$disconnect()
