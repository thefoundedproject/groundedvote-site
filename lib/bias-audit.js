/**
 * GroundedVote Bias-Audit Question Generation Pipeline
 *
 * Pass 1: Claude generates 4 neutral question variants from a candidate position
 * Pass 2: GPT-4 scores each variant on 4 bias dimensions (blind — no authorship info)
 * Pass 3: Claude selects the highest-scoring neutral variant
 *
 * All variants and scores are archived to the database for public transparency.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { prisma } from './prisma.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const GENERATION_MODEL = 'claude-opus-4-8'
const SCORING_MODEL = 'gpt-4o'
const SELECTION_MODEL = 'claude-sonnet-4-6'

// Timeout constants for each AI pass (ms).
// Pass 1 uses Opus which is slower — 60s. Passes 2 & 3 are faster models.
const TIMEOUT_PASS1 = 60_000
const TIMEOUT_PASS2 = 30_000
const TIMEOUT_PASS3 = 20_000

/**
 * Wraps an async AI call with a timeout and one retry on transient error.
 * @param {() => Promise<T>} fn - the AI call to run
 * @param {number} timeoutMs
 * @param {string} label - for logging
 */
async function withTimeoutAndRetry(fn, timeoutMs, label) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const result = await fn(controller.signal)
      clearTimeout(timer)
      return result
    } catch (err) {
      clearTimeout(timer)
      const isTransient =
        err.name === 'AbortError' ||
        err.status === 429 ||
        err.status === 503 ||
        err.status === 502
      if (attempt === 2 || !isTransient) {
        throw new Error(`[bias-audit] ${label} failed after ${attempt} attempt(s): ${err.message}`)
      }
      // Brief back-off before retry
      console.warn(`[bias-audit] ${label} attempt ${attempt} failed (${err.message}), retrying...`)
      await new Promise(r => setTimeout(r, 2000))
    }
  }
}

// ─── PASS 1: QUESTION GENERATION ─────────────────────────────────────────────

async function generateVariants(position, topic) {
  const prompt = `You are generating neutral civic alignment questions for a voter quiz.

A candidate holds the following position on ${topic}:
"${position}"

Generate exactly 4 question variants that ask a voter whether they support this policy approach.

Rules (strictly enforced):
- Use ONLY behavioral language: "Would you support a policy that..." or "Do you believe that..."
- NEVER mention party names (Democrat, Republican, Liberal, Conservative, etc.)
- NEVER use politically coded language (e.g., "radical," "extreme," "socialist," "MAGA")
- NEVER embed assumptions about what a reasonable person believes
- Each variant must be grammatically complete and answerable with agree/disagree
- Keep each question under 40 words
- Questions must be factually grounded in the stated position — do not exaggerate or minimize

Return a JSON array of exactly 4 strings. No other text.`

  return withTimeoutAndRetry(async (signal) => {
    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }, { signal })

    const text = response.content[0].text.trim()
    const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    return JSON.parse(clean)
  }, TIMEOUT_PASS1, 'Pass1:generate')
}

// ─── PASS 2: BIAS SCORING ─────────────────────────────────────────────────────

async function scoreVariants(variants) {
  const prompt = `You are auditing civic quiz questions for political bias.

Score each of the following questions on four dimensions from 0-100 (0 = no bias, 100 = maximum bias):
1. loaded_language: emotionally charged or politically coded words
2. false_equivalence: presenting unequal positions as equal, or ignoring context
3. asymmetric_framing: framing that advantages one political side over another
4. cultural_assumption: embedding cultural or ideological assumptions into the question

Questions to score:
${variants.map((v, i) => `${i + 1}. "${v}"`).join('\n')}

Return a JSON array of objects with this shape:
[{ "index": 0, "loaded_language": 12, "false_equivalence": 5, "asymmetric_framing": 8, "cultural_assumption": 3, "total": 28 }, ...]

Where "total" is the sum of the four scores. Lower total = more neutral.
Return only the JSON array, no other text.`

  return withTimeoutAndRetry(async (signal) => {
    const response = await openai.chat.completions.create({
      model: SCORING_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
    }, { signal })

    const parsed = JSON.parse(response.choices[0].message.content)
    return Array.isArray(parsed) ? parsed : parsed.scores || parsed.questions || Object.values(parsed)[0]
  }, TIMEOUT_PASS2, 'Pass2:score')
}

// ─── PASS 3: SELECTION ────────────────────────────────────────────────────────

async function selectBestVariant(variants, scores) {
  // Sort by total bias score ascending (lowest bias = best)
  const ranked = scores
    .map((s, i) => ({ ...s, text: variants[i] }))
    .sort((a, b) => a.total - b.total)

  const top3 = ranked.slice(0, 3)

  const prompt = `You are making the final selection for a neutral civic quiz question.

The following questions have already been scored for bias (lower score = more neutral).
Select the single best question that is:
- Most factually grounded
- Easiest for any voter to understand regardless of education level
- Completely free of loaded or partisan language

Candidates:
${top3.map((v, i) => `${i + 1}. [Bias score: ${v.total}] "${v.text}"`).join('\n')}

Return only a JSON object: { "selected_index": 0 } where the index refers to the list above (0-based).
No other text.`

  return withTimeoutAndRetry(async (signal) => {
    const response = await anthropic.messages.create({
      model: SELECTION_MODEL,
      max_tokens: 128,
      messages: [{ role: 'user', content: prompt }],
    }, { signal })

    const text = response.content[0].text.trim()
    const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    const { selected_index } = JSON.parse(clean)
    return top3[selected_index]
  }, TIMEOUT_PASS3, 'Pass3:select')
}

// ─── MAIN PIPELINE ────────────────────────────────────────────────────────────

/**
 * Run the full 3-pass pipeline for a question record.
 * Updates the Question in the database with the result.
 */
export async function runBiasAudit(questionId) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { position: true },
  })

  if (!question || !question.position) {
    throw new Error(`Question ${questionId} not found or has no position`)
  }

  // Mark as generating
  await prisma.question.update({
    where: { id: questionId },
    data: { auditStatus: 'GENERATING' },
  })

  try {
    // Pass 1: Generate variants
    const variants = await generateVariants(question.position.stance, question.topic)

    // Pass 2: Score variants
    await prisma.question.update({
      where: { id: questionId },
      data: { auditStatus: 'AUDITING' },
    })
    const scores = await scoreVariants(variants)

    // Archive all variants to the database
    await prisma.questionVariant.createMany({
      data: variants.map((text, i) => ({
        questionId,
        variantText: text,
        generatedBy: GENERATION_MODEL,
        biasScore: scores[i]?.total ?? null,
        loadedLanguage: scores[i]?.loaded_language ?? null,
        falseEquivalence: scores[i]?.false_equivalence ?? null,
        asymmetricFraming: scores[i]?.asymmetric_framing ?? null,
        culturalAssumption: scores[i]?.cultural_assumption ?? null,
        scoredBy: SCORING_MODEL,
        selected: false,
      })),
    })

    // Pass 3: Select best
    const best = await selectBestVariant(variants, scores)

    // Mark selected variant
    await prisma.questionVariant.updateMany({
      where: { questionId, variantText: best.text },
      data: { selected: true },
    })

    // Update the question with the final approved text and scores
    await prisma.question.update({
      where: { id: questionId },
      data: {
        questionText: best.text,
        auditStatus: 'APPROVED',
        biasScore: best.total,
        loadedLanguage: best.loaded_language,
        falseEquivalence: best.false_equivalence,
        asymmetricFraming: best.asymmetric_framing,
        culturalAssumption: best.cultural_assumption,
      },
    })

    return { success: true, questionText: best.text, biasScore: best.total }
  } catch (err) {
    await prisma.question.update({
      where: { id: questionId },
      data: { auditStatus: 'FAILED' },
    })
    throw err
  }
}

/**
 * Generate and audit questions for all positions in a race.
 * Creates one Question per position, then runs the pipeline on each.
 */
export async function generateQuestionsForRace(raceId) {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    include: {
      candidates: {
        include: { positions: true },
      },
    },
  })

  if (!race) throw new Error(`Race ${raceId} not found`)

  // Collect all unique topics in this race
  const topicMap = new Map()
  for (const candidate of race.candidates) {
    for (const position of candidate.positions) {
      if (!topicMap.has(position.topic)) {
        topicMap.set(position.topic, position)
      }
    }
  }

  const results = []

  for (const [topic, position] of topicMap.entries()) {
    // Create a question record
    const question = await prisma.question.create({
      data: {
        raceId,
        positionId: position.id,
        topic,
        questionText: '', // filled by pipeline
        auditStatus: 'PENDING',
      },
    })

    // Run the pipeline
    const result = await runBiasAudit(question.id)
    results.push({ topic, ...result })
    console.log(`  ✓ ${topic}: "${result.questionText}" (bias: ${result.biasScore})`)
  }

  return results
}
