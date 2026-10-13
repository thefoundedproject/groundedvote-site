/**
 * Copyright © 2025 The Founded Project LLC
 * All rights reserved. Proprietary and confidential.
 *
 * GroundedVote™ — A Civic Alignment Engine
 * https://groundedvote.com
 */

/**
 * Recorded roll-call votes for members of Congress, from Voteview (UCLA).
 *
 * The Congress.gov API has no per-member votes endpoint, so the research step
 * only ever saw sponsored and cosponsored bills, and a sitting member's
 * positions fell back to party inference (14 of 15 for one incumbent,
 * 2026-10-12). Voteview publishes every House and Senate roll call with each
 * member's vote and a bioguide_id cross-walk, the same source already used for
 * DW-NOMINATE.
 *
 * Three CSVs per Congress (members, rollcalls, votes), fetched once and held
 * in memory for the process. No disk cache: this module is reachable from
 * instrumentation.js, which Next also compiles for the edge runtime, where
 * Node built-ins do not resolve.
 */

const BASE = 'https://voteview.com/static/data/out'
const UA = 'GroundedVote/2.0 (https://groundedvote.com; civic-alignment-tool)'
const CURRENT_CONGRESS = 119

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += ch
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [header, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, j) => [h, r[j] ?? ''])))
}

async function fetchCsv(kind, congress) {
  const name = `HS${congress}_${kind}.csv`
  const res = await fetch(`${BASE}/${kind}/${name}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Voteview ${name}: HTTP ${res.status}`)
  return res.text()
}

// ─── Loading ──────────────────────────────────────────────────────────────────

const loaded = new Map() // congress -> Promise<{ icpsrByBioguide, rollcalls, votesByIcpsr }>

function loadCongress(congress) {
  if (!loaded.has(congress)) {
    const p = (async () => {
      const [membersCsv, rollcallsCsv, votesCsv] = await Promise.all([
        fetchCsv('members', congress), fetchCsv('rollcalls', congress), fetchCsv('votes', congress),
      ])
      const icpsrByBioguide = new Map()
      for (const m of parseCsv(membersCsv)) {
        if (m.bioguide_id && m.chamber !== 'President') icpsrByBioguide.set(`${m.bioguide_id}|${m.chamber}`, m.icpsr)
      }
      const rollcalls = new Map()
      for (const r of parseCsv(rollcallsCsv)) rollcalls.set(`${r.chamber}|${r.rollnumber}`, r)
      const votesByIcpsr = new Map()
      // The votes file is large; split lines directly (no quoted fields in it).
      const lines = votesCsv.split('\n')
      for (let i = 1; i < lines.length; i++) {
        const [, chamber, rollnumber, icpsr, cast] = lines[i].split(',')
        if (!icpsr) continue
        let arr = votesByIcpsr.get(icpsr)
        if (!arr) votesByIcpsr.set(icpsr, (arr = []))
        arr.push([chamber, rollnumber, Number(cast)])
      }
      return { icpsrByBioguide, rollcalls, votesByIcpsr }
    })()
    p.catch(() => loaded.delete(congress)) // a failed load can be retried
    loaded.set(congress, p)
  }
  return loaded.get(congress)
}

// ─── Votes ────────────────────────────────────────────────────────────────────

// Voteview cast codes: 1-3 yea (incl. paired/announced), 4-6 nay, 7-9 present or not voting.
function position(cast) {
  if (cast >= 1 && cast <= 3) return 'Yea'
  if (cast >= 4 && cast <= 6) return 'Nay'
  return 'Did not vote'
}

// Questions that decide policy. Procedure (electing the Speaker, ordering the
// previous question, tabling, adjourning, quorum) says nothing about a position.
const SUBSTANTIVE = /\b(on passage|passage of the bill|on the (joint |concurrent )?resolution|on agreeing to the (resolution|amendment|conference report)|on motion to suspend the rules and (pass|agree)|on the conference report|on overriding the veto|veto override|on the cloture motion|on the motion to concur|on motion to concur|on concurring in|on the amendment|on the bill|on the nomination|on the motion to recommit)\b/i
const PROCEDURAL = /\b(election of the speaker|previous question|motion to table|table the motion|to adjourn|quorum|journal|motion to reconsider)\b/i
// House rule resolutions set debate terms for other bills; the vote on the
// underlying bill is the one that shows a position.
const RULE = /^providing for (the )?consideration of\b/i

export function isSubstantive(rc) {
  const q = `${rc.vote_question} ${rc.vote_desc}`
  return SUBSTANTIVE.test(q) && !PROCEDURAL.test(q) && !RULE.test(String(rc.vote_desc ?? '').trim())
}

// Landmark laws passed by substituting new text into an unrelated "vehicle"
// bill. Voteview keeps the vehicle's original title (S. 2938 reads as a
// courthouse naming), so neither the shortlist nor the model can recognize
// them. Votes on or after `from` (not amendment votes) get the enacted name.
const VEHICLE_BILLS = {
  '117|HR5376': { from: '2022-08-01', name: 'Inflation Reduction Act of 2022: Medicare prescription drug price negotiation, climate and clean-energy tax credits, 15% corporate minimum tax, IRS funding' },
  '117|S2938': { from: '2022-06-01', name: 'Bipartisan Safer Communities Act: enhanced background checks for gun buyers under 21, funding for state red-flag laws, closes the "boyfriend loophole", mental health and school safety funding' },
  '117|HR4346': { from: '2022-07-01', name: 'CHIPS and Science Act: semiconductor manufacturing subsidies and federal science research funding' },
  '117|HR3684': { from: '2021-08-01', name: 'Infrastructure Investment and Jobs Act: roads, bridges, transit, rail, broadband, water and power grid funding' },
}

export function enactedTitle(congress, rc) {
  const v = VEHICLE_BILLS[`${congress}|${rc.bill_number}`]
  if (!v || rc.date < v.from || /^on (the |agreeing to the )?amendment/i.test(rc.vote_question)) return rc.vote_desc
  return `${v.name} (passed as ${rc.bill_number})`
}

/**
 * A member's substantive recorded votes, newest Congress first.
 * @returns {Promise<Array<{congress, chamber, date, bill, question, title, detail, result, yea, nay, position}>>}
 */
export async function getRecordedVotes(bioguideId, { congresses = [CURRENT_CONGRESS, CURRENT_CONGRESS - 1, CURRENT_CONGRESS - 2] } = {}) {
  if (!bioguideId) return []
  const out = []
  for (const congress of congresses) {
    let data
    try { data = await loadCongress(congress) } catch { continue }
    for (const chamber of ['House', 'Senate']) {
      const icpsr = data.icpsrByBioguide.get(`${bioguideId}|${chamber}`)
      if (!icpsr) continue
      for (const [ch, rollnumber, cast] of data.votesByIcpsr.get(icpsr) ?? []) {
        if (ch !== chamber) continue
        const rc = data.rollcalls.get(`${ch}|${rollnumber}`)
        if (!rc || !isSubstantive(rc)) continue
        out.push({
          congress, chamber, date: rc.date, bill: rc.bill_number || null,
          question: rc.vote_question, title: enactedTitle(congress, rc), detail: rc.dtl_desc,
          result: rc.vote_result, yea: Number(rc.yea_count), nay: Number(rc.nay_count),
          position: position(cast),
        })
      }
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1))
}

// ─── Relevance to a quiz question ─────────────────────────────────────────────

const STOP = new Set(('would you support oppose the a an of to and or for in on with by from as at be is are was were that this these those it its into than more less over under any all not no should federal government national policy policies act bill law laws us u s state states united american americans people new other such which who whom what when how per year years increase decrease expand reduce require allow ban end make provide create current level levels').split(' '))

// Words a voter's question and a bill title use differently for the same thing.
const TOPIC_TERMS = {
  HEALTHCARE: ['health', 'medicare', 'medicaid', 'affordable care', 'insurance', 'drug pricing', 'prescription', 'hospital', 'aca'],
  ECONOMY: ['economy', 'tariff', 'trade', 'inflation', 'debt limit', 'debt ceiling', 'appropriations', 'budget', 'spending'],
  IMMIGRATION: ['immigra', 'border', 'asylum', 'alien', 'citizenship', 'deport', 'visa', 'laken riley', 'migrant'],
  ENVIRONMENT: ['environment', 'climate', 'emission', 'energy', 'epa', 'oil', 'gas', 'drilling', 'permit', 'clean air', 'clean water', 'methane', 'coal', 'renewable'],
  EDUCATION: ['education', 'school', 'student', 'college', 'loan', 'pell', 'teacher'],
  HOUSING: ['housing', 'rent', 'mortgage', 'homeless', 'home'],
  CRIMINAL_JUSTICE: ['crime', 'criminal', 'police', 'prison', 'sentenc', 'justice', 'law enforcement'],
  FOREIGN_POLICY: ['foreign', 'ukraine', 'israel', 'russia', 'china', 'nato', 'aid', 'assistance', 'sanction', 'iran', 'taiwan'],
  VOTING_RIGHTS: ['voter', 'voting', 'election', 'ballot', 'citizenship verification', 'save act', 'registration'],
  SOCIAL_SECURITY: ['social security', 'retirement', 'pension', 'medicare'],
  DRUG_POLICY: ['marijuana', 'cannabis', 'fentanyl', 'opioid', 'drug', 'controlled substance'],
  GUN_POLICY: ['firearm', 'gun', 'background check', 'assault', 'concealed carry', 'second amendment', 'ammunition'],
  LABOR: ['labor', 'worker', 'wage', 'union', 'collective bargaining', 'employment', 'overtime'],
  TAXES: ['tax', 'revenue', 'irs', 'deduction', 'credit', 'reconciliation'],
  VETERANS: ['veteran', 'va ', 'military', 'service member', 'defense'],
  INFRASTRUCTURE: ['infrastructure', 'highway', 'transportation', 'broadband', 'bridge', 'water', 'rail', 'transit'],
  TECHNOLOGY: ['technology', 'artificial intelligence', 'privacy', 'data', 'tiktok', 'cyber', 'internet', 'social media'],
}

function words(text) {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w))
}
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A shortlist of the member's recorded votes on this question's topic, for the
 * research model to judge. Matching is deliberately broad (whole-word topic
 * vocabulary, plus distinctive words from the question); deciding whether a
 * vote actually addresses the question is the model's job, and it must cite
 * the bill when it does. Best matches first, then newest.
 */
export function relevantVotes(votes, question, { max = 25 } = {}) {
  const qWords = [...new Set(words(question.questionText))]
  const topicRes = (TOPIC_TERMS[question.topic] ?? []).map((t) => new RegExp(`\\b${escapeRe(t.trim())}`, 'i'))
  const scored = []
  for (const v of votes) {
    if (v.position === 'Did not vote') continue
    const text = `${v.title} ${v.detail} ${v.bill ?? ''}`
    let t = 0
    for (const re of topicRes) if (re.test(text)) t++
    let q = 0
    for (const w of qWords) if (new RegExp(`\\b${escapeRe(w)}`, 'i').test(text)) q++
    if (t === 0 && q < 2) continue
    scored.push({ v, score: t * 2 + q * 3 })
  }
  scored.sort((a, b) => b.score - a.score || (a.v.date < b.v.date ? 1 : -1))
  return scored.slice(0, max).map((s) => s.v)
}

/** Plain-text block for the research prompt. */
export function formatVotes(votes) {
  if (!votes.length) return ''
  const lines = ['Recorded roll-call votes related to this question (Voteview roll calls; how this member actually voted):']
  for (const v of votes) {
    const bill = v.bill ? `${v.bill} · ` : ''
    const what = [v.title, v.detail].filter(Boolean).join(' · ').slice(0, 220)
    lines.push(`  - ${v.date} · ${v.chamber} · ${bill}${what} · ${v.question} · ${v.result} ${v.yea}-${v.nay} · VOTED ${v.position.toUpperCase()}`)
  }
  return lines.join('\n')
}
