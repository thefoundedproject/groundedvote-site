#!/usr/bin/env node
/**
 * audit-template-questions.js
 * Runs Pass 2 (GPT-4o bias scoring) on all PENDING questions that have no positionId.
 * These are template questions that can't go through the full bias-audit pipeline
 * (which requires a candidate position for Pass 1 generation).
 *
 * Questions scoring below APPROVE_THRESHOLD (total bias score out of 400) are
 * set to APPROVED. Questions scoring above it are set to FAILED for manual review.
 *
 * Usage:
 *   node scripts/audit-template-questions.js
 *   node scripts/audit-template-questions.js --dry-run       (score only, no DB writes)
 *   node scripts/audit-template-questions.js --rescore       (also rescore APPROVED with biasScore=0)
 *   node scripts/audit-template-questions.js --topic ECONOMY (filter by topic)
 *   node scripts/audit-template-questions.js --limit 50      (process N at a time)
 */

const { PrismaClient } = require('@prisma/client')
const OpenAI = require('openai').default

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Questions with total bias score below this are APPROVED; above â FAILED
const APPROVE_THRESHOLD = 60

// How many questions to send in one GPT-4o call (keep under context limits)
const BATCH_SIZE = 10

// ââ CLI FLAGS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const rescore = args.includes('--rescore')
const topicFilter = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null
const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null

// ââ PASS 2: BIAS SCORING ââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function scoreQuestions(questions) {
  const texts = questions.map(q => q.questionText)

  const prompt = `You are auditing civic quiz questions for political bias.

Score each of the following questions on four dimensions from 0-100 (0 = no bias, 100 = maximum bias):
1. loaded_language: emotionally charged or politically coded words
2. false_equivalence: presenting unequal positions as equal, or ignoring context
3. asymmetric_framing: framing that advantages one political side over another
4. cultural_assumption: embedding cultural or ideological assumptions into the question

Questions to score:
${texts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Respond with ONLY a JSON array (no markdown, no explanation) like this:
[{ "index": 0, "loaded_language": 12, "false_equivalence": 5, "asymmetric_framing": 8, "cultural_assumption": 3, "total": 28 }, ...]

Where "total" is the sum of the four dimension scores. One object per question, in order.`

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      })

      const raw = response.choices[0].message.content.trim()
      // Strip any markdown code fences if present
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(jsonStr)
      return Array.isArray(parsed) ? parsed : Object.values(parsed).find(v => Array.isArray(v)) ?? []
    } catch (err) {
      const isTransient = err.status === 429 || err.status === 503 || err.status === 502
      if (attempt === 2 || !isTransient) throw err
      console.warn(`  Attempt ${attempt} failed (${err.message}), retrying in 3s...`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

// ââ MAIN ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function main() {
  console.log('GroundedVote â Template Question Lite Audit (Pass 2 only)')
  console.log(`Threshold: APPROVE if total bias score < ${APPROVE_THRESHOLD}/400`)
  if (dryRun) console.log('DRY RUN â no database writes')
  if (rescore) console.log('RESCORE MODE â also processing APPROVED questions with biasScore=0')
  if (topicFilter) console.log(`Topic filter: ${topicFilter}`)
  console.log('')

  // Base filter: positionless questions (template questions)
  // --rescore also catches APPROVED ones that were bulk-approved with biasScore=0
  const where = rescore
    ? {
        positionId: null,
        OR: [
          { auditStatus: 'PENDING' },
          { auditStatus: 'APPROVED', biasScore: 0 },
        ],
        ...(topicFilter && { topic: topicFilter }),
      }
    : {
        auditStatus: 'PENDING',
        positionId: null,
        ...(topicFilter && { topic: topicFilter }),
      }

  const total = await prisma.question.count({ where })
  const limit = limitArg ?? total

  console.log(`Found ${total} template questions to process. Running ${limit}...`)
  console.log('')

  const questions = await prisma.question.findMany({
    where,
    take: limit,
    orderBy: [{ topic: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, questionText: true, topic: true, raceId: true },
  })

  let approved = 0
  let failed = 0
  let errors = 0

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(questions.length / BATCH_SIZE)

    process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} questions)...`)

    try {
      const scores = await scoreQuestions(batch)

      for (let j = 0; j < batch.length; j++) {
        const q = batch[j]
        const s = scores[j]

        if (!s) {
          console.warn(`\n  WARNING: no score returned for question ${q.id}`)
          errors++
          continue
        }

        const newStatus = s.total < APPROVE_THRESHOLD ? 'APPROVED' : 'FAILED'

        if (!dryRun) {
          await prisma.question.update({
            where: { id: q.id },
            data: {
              auditStatus: newStatus,
              biasScore: s.total,
              loadedLanguage: s.loaded_language,
              falseEquivalence: s.false_equivalence,
              asymmetricFraming: s.asymmetric_framing,
              culturalAssumption: s.cultural_assumption,
            },
          })
        }

        if (newStatus === 'APPROVED') approved++
        else {
          failed++
          console.log(`\n  FAILED [${s.total}] (${q.topic}): "${q.questionText.slice(0, 80)}..."`)
        }
      }

      console.log(` done. (running: ${approved} approved, ${failed} failed)`)

      if (i + BATCH_SIZE < questions.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    } catch (err) {
      console.error(`\n  ERROR on batch ${batchNum}: ${err.message}`)
      errors++
    }
  }

  console.log('')
  console.log('âââââââââââââââââââââââââââââââââââââ')
  console.log(`Processed : ${questions.length}`)
  console.log(`Approved  : ${approved}`)
  console.log(`Failed    : ${failed}`)
  console.log(`Errors    : ${errors}`)
  if (dryRun) console.log('(dry run â no writes made)')
  console.log('âââââââââââââââââââââââââââââââââââââ')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
