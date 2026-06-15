/**
 * CandidateAnswer Auto-Generation Pipeline
 *
 * For each approved question in a race, uses AI to assign each candidate
 * a 1-5 position score based on:
 *   1. Congress.gov voting record (incumbents with bioguideId)
 *   2. Manually-entered Position records from admin
 *   3. Party platform context as a last-resort fallback
 *
 * Stores results as CandidateAnswer records with confidence scores and source notes.
 * Confidence reflects how strong the evidence base is:
 *   - Voting record: 0.85–0.95
 *   - Public statement / stance: 0.70–0.85
 *   - Party platform only: 0.35–0.50
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma.js'
import { getMemberVotes, getMemberSponsored } from './congress.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const POSITION_MODEL = 'claude-sonnet-4-6'

// ─── FETCH CANDIDATE CONTEXT ─────────────────────────────────────────────────

/**
 * Build a plain-text evidence summary for a candidate across all policy topics.
 * Pulls from Congress.gov (if available) + DB position records.
 */
async function buildCandidateContext(candidate) {
  const lines = [
    `Candidate: ${candidate.firstName} ${candidate.lastName}`,
    `Party: ${candidate.party}`,
    `Office sought: ${candidate.race?.chamber === 'SENATE' ? 'U.S. Senate' : `U.S. House, District ${candidate.race?.district}`}`,
    `State: ${candidate.race?.state}`,
    '',
  ]

  // ─── DB positions (manually entered or previously extracted) ───────────────
  const positions = await prisma.position.findMany({
    where: { candidateId: candidate.id },
    orderBy: { createdAt: 'desc' },
  })

  if (positions.length > 0) {
    lines.push('Known positions from record:')
    for (const p of positions) {
      lines.push(`  [${p.topic}] (${p.sourceType}): ${p.stance}`)
    }
    lines.push('')
  }

  // ─── Congress.gov voting record (incumbents only) ──────────────────────────
  if (candidate.bioguideId) {
    try {
      const [votes, sponsored] = await Promise.allSettled([
        getMemberVotes(candidate.bioguideId, 30),
        getMemberSponsored(candidate.bioguideId, 20),
      ])

      if (votes.status === 'fulfilled' && votes.value.length > 0) {
        lines.push('Recent congressional votes (most recent 30):')
        for (const v of votes.value.slice(0, 15)) {
          const desc = v.description || v.bill?.title || v.rollCall || 'Vote recorded'
          const pos = v.memberVoted ? `voted ${v.memberVoted}` : 'present'
          lines.push(`  - ${desc}: ${pos}`)
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
  }

  return lines.join('\n')
}

// ─── AI POSITION SCORING ─────────────────────────────────────────────────────

/**
 * Use Claude to assign a 1-5 position on a specific question given candidate context.
 * Returns { answerValue, confidence, sourceNote }.
 */
async function scorePositionForQuestion(candidateContext, question, partyFallback) {
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

3. Assign a confidence score from 0.0 to 1.0:
   0.9+ = Explicit voting record or direct statement on this exact issue
   0.7–0.9 = Related votes or statements that clearly indicate position
   0.5–0.7 = Inferred from general policy stance or party platform
   Below 0.5 = Very little evidence, mostly party-based inference

4. Write a source note (1 sentence) citing your evidence basis.

CRITICAL RULES:
- If there is genuinely insufficient evidence, use 3 (neutral) with low confidence (0.4), do NOT guess based on party stereotypes alone.
- Do NOT let party affiliation override direct evidence from the record.
- Assign confidence honestly — it is shown to voters as a transparency signal.

Respond with ONLY valid JSON matching this exact structure:
{
  "answerValue": <integer 1-5>,
  "confidence": <float 0.0-1.0>,
  "sourceNote": "<one sentence>",
  "evidenceType": "<VOTING_RECORD|PUBLIC_STATEMENT|CAMPAIGN_PLATFORM|PARTY_INFERENCE>"
}`

  const response = await anthropic.messages.create({
    model: POSITION_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].text.trim()
  const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
  const result = JSON.parse(clean)

  // Validate
  if (result.answerValue < 1 || result.answerValue > 5) throw new Error('Invalid answerValue')
  if (result.confidence < 0 || result.confidence > 1) throw new Error('Invalid confidence')

  return result
}

// ─── BATCH EXTRACTION ────────────────────────────────────────────────────────

/**
 * Extract and store position scores for all candidates in a race,
 * across all approved questions for that race.
 *
 * @param {string} raceId
 * @param {Object} opts
 * @param {boolean} opts.overwrite - re-score even if CandidateAnswer already exists
 * @returns Summary of records created/updated
 */
export async function extractPositionsForRace(raceId, { overwrite = false } = {}) {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    include: {
      candidates: true,
      questions: {
        where: { auditStatus: 'APPROVED' },
      },
    },
  })

  if (!race) throw new Error(`Race ${raceId} not found`)
  if (!race.candidates.length) throw new Error('No candidates found for this race')
  if (!race.questions.length) throw new Error('No approved questions found — run question generation first')

  // Attach race info to each candidate for context building
  const candidatesWithRace = race.candidates.map(c => ({ ...c, race }))

  const summary = { created: 0, skipped: 0, failed: 0, details: [] }

  for (const candidate of candidatesWithRace) {
    // Build context once per candidate (fetches Congress.gov data)
    let context
    try {
      context = await buildCandidateContext(candidate)
    } catch (err) {
      console.error(`Context build failed for ${candidate.lastName}:`, err.message)
      summary.failed++
      continue
    }

    for (const question of race.questions) {
      // Skip if already scored and not overwriting
      if (!overwrite) {
        const existing = await prisma.candidateAnswer.findUnique({
          where: { questionId_candidateId: { questionId: question.id, candidateId: candidate.id } },
        })
        if (existing) {
          summary.skipped++
          continue
        }
      }

      try {
        const result = await scorePositionForQuestion(context, question, candidate.party)

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
        summary.details.push({
          candidate: `${candidate.firstName} ${candidate.lastName}`,
          question: question.questionText.slice(0, 60) + '...',
          answerValue: result.answerValue,
          confidence: result.confidence,
          evidenceType: result.evidenceType,
        })

        // Small delay to avoid API rate limits
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        console.error(`Position score failed: ${candidate.lastName} / ${question.id}:`, err.message)
        summary.failed++
      }
    }
  }

  return summary
}

/**
 * Run for a single candidate + all approved questions in their race.
 * Used when a new challenger is added after questions already exist.
 */
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
