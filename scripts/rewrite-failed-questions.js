#!/usr/bin/env node
/**
 * rewrite-failed-questions.js
 * Rewrites FAILED template questions (positionId: null) to reduce bias,
 * then re-scores them. Questions that pass the rescore (total < 60/400)
 * are updated in-place and set to APPROVED.
 *
 * Deduplicates by questionText â if the same question was seeded across
 * multiple races, it rewrites once and applies to all copies.
 *
 * Usage:
 *   node scripts/rewrite-failed-questions.js
 *   node scripts/rewrite-failed-questions.js --dry-run
 *   node scripts/rewrite-failed-questions.js --topic GUN_POLICY
 */

const { PrismaClient } = require('@prisma/client')
const OpenAI = require('openai').default

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const APPROVE_THRESHOLD = 60

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const topicFilter = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : null

// âââ GPT-4o: REWRITE ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function rewriteQuestion(questionText, biasScore) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `You are editing civic quiz questions for a nonpartisan voter guide to make them politically neutral.

This question scored ${biasScore}/400 on a bias audit (passing threshold is below 60). Rewrite it to score below 60 by:
- Removing loaded or emotionally charged language
- Presenting the policy option factually without implied judgment
- Avoiding asymmetric framing that advantages one political side
- Keeping it as a clear, concise yes/no policy question
- Preserving the core policy topic

Original question:
"${questionText}"

Respond with ONLY the rewritten question text â no quotes, no explanation, no preamble.`
    }],
    temperature: 0.3,
  })
  return response.choices[0].message.content.trim().replace(/^["']|["']$/g, '').trim()
}

// âââ GPT-4o: RESCORE ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function scoreQuestion(text) {
  const prompt = `You are auditing civic quiz questions for political bias.

Score this question on four dimensions from 0-100 (0 = no bias, 100 = maximum bias):
1. loaded_language: emotionally charged or politically coded words
2. false_equivalence: presenting unequal positions as equal, or ignoring context
3. asymmetric_framing: framing that advantages one political side over another
4. cultural_assumption: embedding cultural or ideological assumptions into the question

Question: "${text}"

Respond with ONLY a JSON object like: {"loaded_language": 10, "false_equivalence": 5, "asymmetric_framing": 8, "cultural_assumption": 3, "total": 26}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  })
  const raw = response.choices[0].message.content.trim()
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(jsonStr)
}

// âââ MAIN ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function main() {
  console.log('GroundedVote â Rewrite Failed Template Questions')
  console.log(`Threshold: APPROVE if total bias score < ${APPROVE_THRESHOLD}/400`)
  if (dryRun) console.log('DRY RUN â no database writes')
  if (topicFilter) console.log(`Topic filter: ${topicFilter}`)
  console.log('')

  const where = {
    auditStatus: 'FAILED',
    positionId: null,
    ...(topicFilter && { topic: topicFilter }),
  }

  const questions = await prisma.question.findMany({
    where,
    orderBy: [{ topic: 'asc' }, { biasScore: 'desc' }],
    select: { id: true, questionText: true, topic: true, biasScore: true },
  })

  console.log(`Found ${questions.length} failed template questions.`)

  // Count unique texts â the same template question repeats across races
  const uniqueTexts = new Set(questions.map(q => q.questionText))
  console.log(`Unique question texts: ${uniqueTexts.size} (rest are duplicates across races)\n`)

  // Cache: originalText -> { rewrittenText, score }
  const cache = new Map()

  let approved = 0
  let stillFailed = 0
  let errors = 0

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const isNew = !cache.has(q.questionText)

    process.stdout.write(
      `[${i + 1}/${questions.length}] ${q.topic} [${q.biasScore}] ${isNew ? 'â rewriting' : 'â cached'}... `
    )

    try {
      let rewritten, score

      if (cache.has(q.questionText)) {
        const cached = cache.get(q.questionText)
        rewritten = cached.rewrittenText
        score = cached.score
      } else {
        rewritten = await rewriteQuestion(q.questionText, q.biasScore)
        score = await scoreQuestion(rewritten)
        cache.set(q.questionText, { rewrittenText: rewritten, score })
      }

      const newStatus = score.total < APPROVE_THRESHOLD ? 'APPROVED' : 'FAILED'

      if (!dryRun) {
        await prisma.question.update({
          where: { id: q.id },
          data: {
            questionText: rewritten,
            auditStatus: newStatus,
            biasScore: score.total,
            loadedLanguage: score.loaded_language,
            falseEquivalence: score.false_equivalence,
            asymmetricFraming: score.asymmetric_framing,
            culturalAssumption: score.cultural_assumption,
          },
        })
      }

      if (newStatus === 'APPROVED') {
        approved++
        console.log(`APPROVED [${score.total}]`)
        if (isNew) console.log(`  "${rewritten.slice(0, 90)}${rewritten.length > 90 ? '...' : ''}"`)
      } else {
        stillFailed++
        console.log(`STILL FAILED [${score.total}]`)
        if (isNew) console.log(`  "${rewritten.slice(0, 90)}${rewritten.length > 90 ? '...' : ''}"`)
      }
    } catch (err) {
      console.error(`ERROR: ${err.message}`)
      errors++
    }

    // Breathing room between fresh GPT calls; no delay for cached
    if (isNew && i < questions.length - 1) {
      await new Promise(r => setTimeout(r, 400))
    }
  }

  console.log('')
  console.log('â'.repeat(40))
  console.log(`Processed    : ${questions.length}`)
  console.log(`Now approved : ${approved}`)
  console.log(`Still failed : ${stillFailed}`)
  console.log(`Errors       : ${errors}`)
  if (dryRun) console.log('(dry run â no writes made)')
  console.log('â'.repeat(40))
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
