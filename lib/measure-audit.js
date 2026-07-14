// © 2025 The Founded Project LLC — All rights reserved.
// lib/measure-audit.js
//
// Generates one bias-audited quiz question per ballot measure using the
// same three-pass pipeline as race questions (generate variants → blind
// bias scoring → selection). Variants and scores persist in auditTrail
// for the same transparency guarantee races get.

import { prisma } from './prisma.js'
import { generateVariants, scoreVariants, selectBestVariant } from './bias-audit.js'

/** Run the audit pipeline for one measure and persist the result. */
export async function auditMeasure(measureId) {
  const measure = await prisma.ballotMeasure.findUnique({ where: { id: measureId } })
  if (!measure) throw new Error(`Measure ${measureId} not found`)

  await prisma.ballotMeasure.update({
    where: { id: measureId },
    data: { auditStatus: 'GENERATING' },
  })

  try {
    // The measure's plain-language description is the "position" the
    // question asks about; topic label keeps the prompt generic.
    const variants = await generateVariants(measure.description, 'this ballot measure')
    await prisma.ballotMeasure.update({ where: { id: measureId }, data: { auditStatus: 'AUDITING' } })
    const scores = await scoreVariants(variants)
    const best = await selectBestVariant(variants, scores)

    await prisma.ballotMeasure.update({
      where: { id: measureId },
      data: {
        questionText: best.text,
        biasScore: best.total,
        auditStatus: 'APPROVED',
        auditTrail: { variants, scores, selected: best },
      },
    })
    return { measureId, title: measure.title, questionText: best.text, biasScore: best.total }
  } catch (err) {
    await prisma.ballotMeasure.update({ where: { id: measureId }, data: { auditStatus: 'FAILED' } })
    throw err
  }
}

/** Audit every measure that has no approved question yet. */
export async function auditAllMeasures() {
  const pending = await prisma.ballotMeasure.findMany({
    where: { auditStatus: { in: ['PENDING', 'FAILED'] } },
    select: { id: true, state: true, title: true },
    orderBy: [{ state: 'asc' }, { title: 'asc' }],
  })
  const summary = { audited: 0, failed: 0 }
  for (const m of pending) {
    try {
      const r = await auditMeasure(m.id)
      summary.audited++
      console.log(`[measure-audit] ${m.state} ${m.title}: bias=${r.biasScore} — ${r.questionText.slice(0, 70)}…`)
    } catch (err) {
      summary.failed++
      console.error(`[measure-audit] ${m.state} ${m.title} failed: ${err.message}`)
      // Billing failures doom the rest — stop cleanly
      if (/credit balance is too low/i.test(err.message)) {
        console.error('[measure-audit] HALTING — Anthropic credits exhausted.')
        break
      }
    }
    await new Promise(r => setTimeout(r, 800))
  }
  return summary
}
