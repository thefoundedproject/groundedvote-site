// © 2025 The Founded Project LLC — All rights reserved.
// scripts/generate-state-questions.js
//
// Builds the state-legislature question set: audits each reviewed policy
// statement ONCE through the 3-pass bias pipeline (generate variants ->
// blind score -> select best), then creates a Question row per target
// race. Auditing once and replicating the approved text avoids paying for
// the same audit per race AND avoids the near-duplicate problem the 2026-09
// dedupe cleaned up — one question per topic per race, by construction.
//
// The three passes mirror lib/bias-audit.js (canonical prompts + the
// GPT-4o shape-normalizing parser) — inlined here because lib/ is ESM and
// console scripts run as raw CommonJS Node.
//
//   node scripts/generate-state-questions.js \
//     --topics data/mn-state-topics.json \
//     --matchups data/mn-house-matchups-2026.json          # dry run: audits nothing
//   GENERATION_MODEL=claude-sonnet-4-6 node scripts/... --apply
//
// Variants are archived on the first race's question row (transparency);
// bias scores are copied to every replica so the audit trail shows them.

const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const Anthropic = require('@anthropic-ai/sdk')
const OpenAI = require('openai').default

const prisma = new PrismaClient()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const APPLY = process.argv.includes('--apply')
const arg = (f) => { const i = process.argv.indexOf(f); return i !== -1 ? process.argv[i + 1] : null }

const GENERATION_MODEL = process.env.GENERATION_MODEL || 'claude-opus-4-8'
const SCORING_MODEL = 'gpt-4o'
const SELECTION_MODEL = 'claude-sonnet-4-6'

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
  const response = await anthropic.messages.create({
    model: GENERATION_MODEL, max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = response.content[0].text.trim()
  return JSON.parse(text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim())
}

async function scoreVariants(variants) {
  const prompt = `You are auditing civic quiz questions for political bias.

Score each of the following questions on four dimensions from 0-100 (0 = no bias, 100 = maximum bias):
1. loaded_language: emotionally charged or politically coded words
2. false_equivalence: presenting unequal positions as equal, or ignoring context
3. asymmetric_framing: framing that advantages one political side over another
4. cultural_assumption: embedding cultural or ideological assumptions into the question

Questions to score:
${variants.map((v, i) => `${i + 1}. "${v}"`).join('\n')}

Return a JSON object with exactly this shape:
{ "scores": [{ "index": 0, "loaded_language": 12, "false_equivalence": 5, "asymmetric_framing": 8, "cultural_assumption": 3, "total": 28 }, ...] }

Where "total" is the sum of the four scores. Lower total = more neutral.
Return only the JSON object, no other text.`
  const response = await openai.chat.completions.create({
    model: SCORING_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0,
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Pass 2 returned empty content')
  const parsed = JSON.parse(content)
  let scores = null
  if (Array.isArray(parsed)) scores = parsed
  else if (Array.isArray(parsed.scores)) scores = parsed.scores
  else if (Array.isArray(parsed.questions)) scores = parsed.questions
  else {
    const values = Object.values(parsed)
    if (values.length === 1 && Array.isArray(values[0])) scores = values[0]
    else if (values.length >= variants.length && values.every(v => v && typeof v === 'object')) scores = values
  }
  if (!Array.isArray(scores) || scores.length < variants.length) {
    throw new Error(`Pass 2 returned unusable shape: ${content.slice(0, 120)}`)
  }
  return scores.map((s, i) => ({
    index: s.index ?? i,
    loaded_language: s.loaded_language ?? 0,
    false_equivalence: s.false_equivalence ?? 0,
    asymmetric_framing: s.asymmetric_framing ?? 0,
    cultural_assumption: s.cultural_assumption ?? 0,
    total: s.total ?? (s.loaded_language ?? 0) + (s.false_equivalence ?? 0) + (s.asymmetric_framing ?? 0) + (s.cultural_assumption ?? 0),
  }))
}

async function selectBestVariant(variants, scores) {
  const ranked = scores.map((s, i) => ({ ...s, text: variants[i] })).sort((a, b) => a.total - b.total)
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
  const response = await anthropic.messages.create({
    model: SELECTION_MODEL, max_tokens: 128,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = response.content[0].text.trim()
  const { selected_index } = JSON.parse(text.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim())
  return top3[selected_index]
}

async function main() {
  const { topics } = JSON.parse(fs.readFileSync(arg('--topics'), 'utf8'))
  const { races: matchups } = JSON.parse(fs.readFileSync(arg('--matchups'), 'utf8'))

  const races = await prisma.race.findMany({
    where: { label: { in: matchups.map(m => m.race) }, level: 'STATE' },
    include: { questions: { select: { topic: true } } },
  })
  for (const m of matchups) if (!races.some(r => r.label === m.race)) console.error(`✗ race not found: ${m.race}`)

  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN — pass --apply to run audits and write ===')
  console.log(`Topics: ${topics.length} · target races: ${races.length} · generation model: ${GENERATION_MODEL}`)
  if (!APPLY) {
    for (const t of topics) console.log(`  ${t.topic}: ${t.statement.slice(0, 90)}...`)
    return
  }

  let createdTotal = 0
  for (const t of topics) {
    console.log(`\n[${t.topic}] auditing...`)
    const variants = await generateVariants(t.statement, t.topic)
    const scores = await scoreVariants(variants)
    const best = await selectBestVariant(variants, scores)
    console.log(`  selected (bias ${best.total}): ${best.text}`)

    let first = true
    for (const race of races) {
      if (race.questions.some(q => q.topic === t.topic)) { console.log(`  = ${race.label}: topic exists, skipped`); continue }
      const q = await prisma.question.create({
        data: {
          raceId: race.id,
          topic: t.topic,
          questionText: best.text,
          weight: 1.0,
          auditStatus: 'APPROVED',
          biasScore: best.total,
          loadedLanguage: best.loaded_language,
          falseEquivalence: best.false_equivalence,
          asymmetricFraming: best.asymmetric_framing,
          culturalAssumption: best.cultural_assumption,
        },
      })
      createdTotal++
      if (first) {
        await prisma.questionVariant.createMany({
          data: variants.map((text, i) => ({
            questionId: q.id,
            variantText: text,
            generatedBy: GENERATION_MODEL,
            biasScore: scores[i]?.total ?? null,
            loadedLanguage: scores[i]?.loaded_language ?? null,
            falseEquivalence: scores[i]?.false_equivalence ?? null,
            asymmetricFraming: scores[i]?.asymmetric_framing ?? null,
            culturalAssumption: scores[i]?.cultural_assumption ?? null,
            scoredBy: SCORING_MODEL,
            selected: text === best.text,
          })),
        })
        first = false
      }
    }
  }
  console.log(`\nQuestions created: ${createdTotal}`)
}

main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
