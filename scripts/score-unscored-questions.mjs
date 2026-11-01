#!/usr/bin/env node
/**
 * score-unscored-questions.mjs
 * Scores APPROVED questions that have no bias score on record. Question text
 * and status never change. A question at or over the approval threshold keeps
 * no score and is listed for a decision.
 *
 * Copies of the same text across races are scored once.
 *
 * Usage (Railway console):
 *   node scripts/score-unscored-questions.mjs           dry run, no writes
 *   node scripts/score-unscored-questions.mjs --apply
 */
import { PrismaClient } from '@prisma/client'
import { scoreWithBackup } from '../lib/scoring-model.mjs'

const APPROVE_THRESHOLD = 60
const apply = process.argv.includes('--apply')
const prisma = new PrismaClient()

// Same dimensions and wording as scoreVariants in lib/bias-audit.js.
const scoringPrompt = text => `You are auditing civic quiz questions for political bias.

Score each of the following questions on four dimensions from 0-100 (0 = no bias, 100 = maximum bias):
1. loaded_language: emotionally charged or politically coded words
2. false_equivalence: presenting unequal positions as equal, or ignoring context
3. asymmetric_framing: framing that advantages one political side over another
4. cultural_assumption: embedding cultural or ideological assumptions into the question

Questions to score:
1. "${text}"

Return a JSON object with exactly this shape:
{ "scores": [{ "index": 0, "loaded_language": 12, "false_equivalence": 5, "asymmetric_framing": 8, "cultural_assumption": 3, "total": 28 }] }

Where "total" is the sum of the four scores. Lower total = more neutral.
Return only the JSON object, no other text.`

const where = { auditStatus: 'APPROVED', biasScore: null }
const questions = await prisma.question.findMany({ where, select: { id: true, questionText: true } })
const byText = new Map()
for (const q of questions) byText.set(q.questionText, [...(byText.get(q.questionText) ?? []), q.id])
console.log(`${questions.length} unscored questions, ${byText.size} distinct texts${apply ? '' : ' (dry run)'}`)

let written = 0
const heldBack = []
for (const [text, ids] of byText) {
  const [score] = await scoreWithBackup(scoringPrompt(text), 1)
  console.log(`[${score.total}/400 by ${score.scoredBy}] x${ids.length} ${text}`)
  if (score.total >= APPROVE_THRESHOLD) {
    heldBack.push({ text, total: score.total, copies: ids.length })
    continue
  }
  if (apply) {
    const { count } = await prisma.question.updateMany({
      where: { id: { in: ids }, ...where },
      data: {
        biasScore: score.total,
        loadedLanguage: score.loaded_language,
        falseEquivalence: score.false_equivalence,
        asymmetricFraming: score.asymmetric_framing,
        culturalAssumption: score.cultural_assumption,
      },
    })
    written += count
  }
}
console.log(`SCORED_DONE written=${written} heldBack=${JSON.stringify(heldBack)}`)
await prisma.$disconnect()
