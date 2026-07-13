/**
 * Copyright Â© 2025 The Founded Project LLC
 * All rights reserved. Proprietary and confidential.
 *
 * This source code is the exclusive property of The Founded Project LLC
 * and may not be copied, modified, distributed, or used without explicit
 * written permission from The Founded Project LLC.
 *
 * GroundedVoteâ¢ â A Civic Alignment Engine
 * https://groundedvote.com
 */

/**
 * CandidateAnswer Auto-Generation Pipeline â v3
 *
 * Evidence priority (highest â lowest):
 * 1. VoteSmart Political Courage Test â self-reported by candidate
 * 2. VoteSmart interest group ratings â ACU / ADA / AFL-CIO scorecards
 * 3. Congress.gov voting record â incumbents with bioguideId
 * 3b. DW-NOMINATE academic score â voteview.com calibration anchor
 * 4. Ballotpedia candidate profile â aggregated positions, endorsements
 * 5. DB Position records â manually entered via admin
 * 6. Party platform â last-resort inference
 *
 * Confidence tiers reflect evidence quality:
 * 0.90â0.98 VoteSmart Political Courage Test (candidate's own words)
 * 0.85â0.95 Congress.gov voting record
 * 0.75â0.88 Interest group ratings (ACU/ADA)
 * 0.65â0.80 Ballotpedia profile text
 * 0.70â0.85 Public statement / stance (DB)
 * 0.35â0.50 Party platform only
 *
 * DW-NOMINATE is used as a calibration anchor, not a direct evidence source.
 * It raises or lowers confidence when AI scores diverge from the academic baseline.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma.js'
import { getMemberVotes, getMemberSponsored } from './congress.js'
import { getDWNominateScore, formatDWNominateContext } from './dw-nominate.js'

// Created on first use — module-scope construction crashes `next build`
// when ANTHROPIC_API_KEY is absent.
let _anthropic
const anthropic = () => (_anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
const POSITION_MODEL = 'claude-sonnet-4-6'

// âââ VOTESMART API ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const VS_BASE = 'http://api.votesmart.org'
const VS_KEY = process.env.VOTESMART_API_KEY

async function findVoteSmartId(firstName, lastName, state) {
  if (!VS_KEY) return null
  try {
    const url = `${VS_BASE}/Candidates.getByLastname?lastName=${encodeURIComponent(lastName)}&stageId=&key=${VS_KEY}&o=JSON`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const candidates = data?.candidateList?.candidate
    if (!candidates) return null
    const list = Array.isArray(candidates) ? candidates : [candidates]
    const match = list.find(c =>
      c.firstName?.toLowerCase().startsWith(firstName[0].toLowerCase()) &&
      c.stateId?.toLowerCase() === state?.toLowerCase()
    )
    return match?.candidateId ?? null
  } catch { return null }
}

async function getVoteSmartPoliticalCourageTest(vsId) {
  if (!VS_KEY || !vsId) return null
  try {
    const url = `${VS_BASE}/Npf.getCandidatePosition?candidateId=${vsId}&key=${VS_KEY}&o=JSON`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const positions = data?.npfList?.npf
    if (!positions) return null
    const list = Array.isArray(positions) ? positions : [positions]
    if (list.length === 0) return null
    const lines = ['VoteSmart Political Courage Test (self-reported by candidate):']
    for (const p of list.slice(0, 20)) {
      lines.push(`  [${p.categoryName || 'Policy'}] ${p.support ?? ''}: ${p.text || ''}`)
    }
    return lines.join('\n')
  } catch { return null }
}

async function getVoteSmartRatings(vsId) {
  if (!VS_KEY || !vsId) return null
  try {
    const url = `${VS_BASE}/Rating.getCandidateRating?candidateId=${vsId}&key=${VS_KEY}&o=JSON`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const ratings = data?.candidateRating?.rating
    if (!ratings) return null
    const list = Array.isArray(ratings) ? ratings : [ratings]
    const PRIORITY_GROUPS = [
      'American Conservative Union', 'ACU', 'CPAC',
      'Americans for Democratic Action', 'ADA',
      'AFL-CIO', 'NFIB', 'Sierra Club', 'NRA',
      'NARAL', 'National Right to Life', 'ACLU',
      'Heritage Action', 'Club for Growth', 'FreedomWorks',
      'Planned Parenthood', 'US Chamber of Commerce',
    ]
    const relevant = list.filter(r =>
      PRIORITY_GROUPS.some(g => r.ratingName?.includes(g) || r.sigId?.toString())
    ).slice(0, 12)
    if (relevant.length === 0) return null
    const lines = ['Interest group ratings (ideological scorecards):']
    for (const r of relevant) {
      lines.push(`  ${r.ratingName}: ${r.rating}/100 (${r.timespan || 'recent'})`)
    }
    return lines.join('\n')
  } catch { return null }
}

// âââ BALLOTPEDIA SCRAPER ââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function getBallotpediaProfile(firstName, lastName) {
  try {
    const name = `${firstName}_${lastName}`.replace(/\s+/g, '_')
    const apiUrl = `https://ballotpedia.org/w/api.php?action=query&titles=${encodeURIComponent(name)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'GroundedVote/2.0 (https://groundedvote.com; civic-alignment-tool)' }
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0]
    if (!page || page.missing !== undefined) return null
    const text = page.extract || ''
    if (text.length < 100) return null
    const trimmed = text.slice(0, 3000)
    return `Ballotpedia profile summary:\n${trimmed}`
  } catch { return null }
}

// âââ FETCH CANDIDATE CONTEXT âââââââââââââââââââââââââââââââââââââââââââââââââ

/**
 * Build a rich plain-text evidence summary for a candidate.
 * Pulls from VoteSmart (PCT + ratings) â Congress.gov + DW-NOMINATE
 * â Ballotpedia â DB positions.
 */
async function buildCandidateContext(candidate) {
  const lines = [
    `Candidate: ${candidate.firstName} ${candidate.lastName}`,
    `Party: ${candidate.party}`,
    `Office sought: ${candidate.race?.chamber === 'SENATE' ? 'U.S. Senate' : `U.S. House, District ${candidate.race?.district}`}`,
    `State: ${candidate.race?.state}`,
    '',
  ]

  // âââ 1. VoteSmart Political Courage Test âââââââââââââââââââââââââââââââââ
  const vsId = await findVoteSmartId(candidate.firstName, candidate.lastName, candidate.race?.state)
  if (vsId) {
    const pct = await getVoteSmartPoliticalCourageTest(vsId)
    if (pct) { lines.push(pct); lines.push('') }

    const ratings = await getVoteSmartRatings(vsId)
    if (ratings) { lines.push(ratings); lines.push('') }
  }

  // âââ 2. Congress.gov voting record (incumbents only) âââââââââââââââââââââ
  if (candidate.bioguideId) {
    try {
      const [votes, sponsored] = await Promise.allSettled([
        getMemberVotes(candidate.bioguideId, 30),
        getMemberSponsored(candidate.bioguideId, 20),
      ])
      if (votes.status === 'fulfilled' && votes.value.length > 0) {
        lines.push('Recently cosponsored legislation (bills they chose to back):')
        for (const v of votes.value.slice(0, 15)) {
          const desc = v.title || v.bill?.title || 'Bill cosponsored'
          lines.push(`  - ${desc} (${v.policyArea?.name || 'General'})`)
        }
        lines.push('')
      }
      if (sponsored.status === 'fulfilled' && sponsored.value.length > 0) {
        lines.push('Recently sponsored legislation:')
        for (const b of sponsored.value.slice(0, 10)) {
          lines.push(`  - ${b.title} (${b.policyArea?.name || 'General'})`)
        }
        lines.push('')
      }
    } catch (err) {
      lines.push(`[Congress.gov data unavailable: ${err.message}]`)
      lines.push('')
    }

    // âââ 2b. DW-NOMINATE calibration anchor ââââââââââââââââââââââââââââââ
    // For incumbents with a bioguideId, pull their academic ideological score.
    // This is passed to the AI as a calibration signal, not a direct source.
    // Positions that diverge sharply from this baseline without direct evidence
    // should carry lower confidence.
    const dwScore = await getDWNominateScore(candidate.bioguideId)
    const dwContext = formatDWNominateContext(dwScore)
    if (dwContext) { lines.push(dwContext); lines.push('') }
  }

  // âââ 3. Ballotpedia profile âââââââââââââââââââââââââââââââââââââââââââââââ
  const bpProfile = await getBallotpediaProfile(candidate.firstName, candidate.lastName)
  if (bpProfile) { lines.push(bpProfile); lines.push('') }

  // âââ 4. DB positions (manually entered or previously extracted) âââââââââââ
  const positions = await prisma.position.findMany({
    where: { candidateId: candidate.id },
    orderBy: { createdAt: 'desc' },
  })
  if (positions.length > 0) {
    lines.push('Known positions from admin record:')
    for (const p of positions) {
      lines.push(`  [${p.topic}] (${p.sourceType}): ${p.stance}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// âââ AI POSITION SCORING âââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function scorePositionForQuestion(candidateContext, question) {
  const prompt = `You are a nonpartisan political analyst assigning a candidate's position on a policy question for a voter alignment tool.

${candidateContext}

Question the voter will be asked:
"${question.questionText}"

Topic: ${question.topic}

Your task:
1. Review the candidate's record above.
2. Assign a position score from 1 to 5:
   1 = Strongly Oppose (would strongly oppose this policy approach)
   2 = Oppose
   3 = Neutral / No clear position
   4 = Support
   5 = Strongly Support (has actively championed this policy approach)

IMPORTANT: Use the full range. A moderate who leans toward supporting something
but with reservations should be 3-4, NOT 5. Reserve 5 for candidates who have
actively championed, sponsored legislation for, or made this a centerpiece issue.
Reserve 1 for candidates who have actively opposed or campaigned against the policy.

3. Assign a confidence score from 0.0 to 1.0:
   0.90â0.98 = VoteSmart Political Courage Test (candidate self-reported)
   0.85â0.95 = Explicit voting record or direct statement on this exact issue
   0.75â0.88 = Interest group ratings that directly measure this issue area
   0.65â0.80 = Ballotpedia profile or related votes that clearly indicate position
   0.50â0.65 = Inferred from general policy stance
   Below 0.50 = Very little evidence, mostly party-based inference

   DW-NOMINATE calibration: if a DW-NOMINATE score appears above and your
   assigned position sharply contradicts the academic ideological baseline
   WITHOUT direct supporting evidence, reduce confidence by 0.10â0.20.
   If your position aligns with the DW-NOMINATE baseline AND is supported by
   direct evidence, confidence may be at the upper end of its tier.

4. Write a source note (1 sentence) citing your evidence basis.
   If DW-NOMINATE influenced your confidence, note it briefly.

CRITICAL RULES:
- If there is genuinely insufficient evidence, use 3 (neutral) with low confidence (0.4).
- Do NOT let party affiliation override direct evidence from the record.
- A moderate Democrat who supports a watered-down version of a policy scores 3-4, not 5.
- A Republican who rhetorically opposes but has not actively fought a policy scores 2, not 1.
- DW-NOMINATE is a general calibration signal â direct evidence always takes priority.
- Assign confidence honestly â it is shown to voters as a transparency signal.

Respond with ONLY valid JSON:
{
  "answerValue": <integer 1-5>,
  "confidence": <float 0.0-1.0>,
  "sourceNote": "<one sentence>",
  "evidenceType": "<VOTESMART_PCT|VOTESMART_RATING|VOTING_RECORD|PUBLIC_STATEMENT|BALLOTPEDIA|CAMPAIGN_PLATFORM|PARTY_INFERENCE>",
  "dwNominateUsed": <boolean>
}`

  const response = await anthropic().messages.create({
    model: POSITION_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].text.trim()
  const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
  const result = JSON.parse(clean)

  if (result.answerValue < 1 || result.answerValue > 5) throw new Error('Invalid answerValue')
  if (result.confidence < 0 || result.confidence > 1) throw new Error('Invalid confidence')

  // The prompt's evidence labels are richer than the EvidenceType enum —
  // normalize to the schema's four confidence bands (white paper taxonomy).
  const EVIDENCE_MAP = {
    VOTESMART_PCT: 'CAMPAIGN_PLATFORM',   // candidate self-report
    VOTESMART_RATING: 'VOTING_RECORD',    // scorecards derived from votes
    BALLOTPEDIA: 'PUBLIC_STATEMENT',      // aggregated public positions
    VOTING_RECORD: 'VOTING_RECORD',
    PUBLIC_STATEMENT: 'PUBLIC_STATEMENT',
    CAMPAIGN_PLATFORM: 'CAMPAIGN_PLATFORM',
    PARTY_INFERENCE: 'PARTY_INFERENCE',
  }
  result.evidenceType = EVIDENCE_MAP[result.evidenceType] ?? 'PARTY_INFERENCE'

  return result
}

// âââ BATCH EXTRACTION âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function extractPositionsForRace(raceId, { overwrite = false } = {}) {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    include: {
      candidates: true,
      questions: { where: { auditStatus: 'APPROVED' } },
    },
  })

  if (!race) throw new Error(`Race ${raceId} not found`)
  if (!race.candidates.length) throw new Error('No candidates found for this race')
  if (!race.questions.length) throw new Error('No approved questions â run question generation first')

  const candidatesWithRace = race.candidates.map(c => ({ ...c, race }))
  const summary = { created: 0, skipped: 0, failed: 0, dwNominateUsed: 0, details: [] }

  const questionIds = race.questions.map(q => q.id)

  for (const candidate of candidatesWithRace) {
    // Skip the expensive context build (Ballotpedia/Congress.gov fetches)
    // when this candidate already has answers for every approved question.
    if (!overwrite) {
      const existing = await prisma.candidateAnswer.count({
        where: { candidateId: candidate.id, questionId: { in: questionIds } },
      })
      if (existing >= questionIds.length) {
        summary.skipped += existing
        continue
      }
    }

    let context
    try {
      context = await buildCandidateContext(candidate)
    } catch (err) {
      console.error(`Context build failed for ${candidate.lastName}:`, err.message)
      summary.failed++
      continue
    }

    for (const question of race.questions) {
      if (!overwrite) {
        const existing = await prisma.candidateAnswer.findUnique({
          where: { questionId_candidateId: { questionId: question.id, candidateId: candidate.id } },
        })
        if (existing) { summary.skipped++; continue }
      }

      try {
        const result = await scorePositionForQuestion(context, question)
        await prisma.candidateAnswer.upsert({
          where: { questionId_candidateId: { questionId: question.id, candidateId: candidate.id } },
          create: {
            questionId: question.id,
            candidateId: candidate.id,
            answerValue: result.answerValue,
            confidence: result.confidence,
            sourceNote: result.sourceNote,
            evidenceType: result.evidenceType ?? 'PARTY_INFERENCE',
          },
          update: {
            answerValue: result.answerValue,
            confidence: result.confidence,
            sourceNote: result.sourceNote,
            evidenceType: result.evidenceType ?? 'PARTY_INFERENCE',
          },
        })
        summary.created++
        if (result.dwNominateUsed) summary.dwNominateUsed++
        summary.details.push({
          candidate: `${candidate.firstName} ${candidate.lastName}`,
          question: question.questionText.slice(0, 60) + '...',
          answerValue: result.answerValue,
          confidence: result.confidence,
          evidenceType: result.evidenceType,
          dwNominateUsed: result.dwNominateUsed ?? false,
        })
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        console.error(`Position score failed: ${candidate.lastName} / ${question.id}:`, err.message)
        summary.failed++
      }
    }
  }

  return summary
}

export async function extractPositionsForCandidate(candidateId, { overwrite = false } = {}) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      race: {
        include: {
          candidates: true,
          questions: { where: { auditStatus: 'APPROVED' } },
        },
      },
    },
  })
  if (!candidate) throw new Error(`Candidate ${candidateId} not found`)
  return extractPositionsForRace(candidate.raceId, { overwrite })
}
