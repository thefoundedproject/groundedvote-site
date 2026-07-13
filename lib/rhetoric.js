// © 2025 The Founded Project LLC — All rights reserved.
// lib/rhetoric.js
//
// Record vs. rhetoric consistency scoring. Runs the conviction check
// (stated positions vs. actual congressional votes, judged by Claude)
// and persists a plain 0–100 score plus a per-topic breakdown on the
// Candidate row. Only meaningful for candidates with a voting record —
// challengers stay null and the UI says so plainly.
//
// The score counts only positions the check could judge: unclear
// positions are excluded from the denominator and reported separately.

import { prisma } from './prisma.js'
import { checkConvictions } from './conviction.js'

export async function computeRhetoricScore(candidateId) {
  const convictions = await checkConvictions(candidateId)
  if (!convictions.length) return null // no record or no judgeable positions

  const consistent = convictions.filter(c => c.consistent === true).length
  const inconsistent = convictions.filter(c => c.consistent === false).length
  const unclear = convictions.filter(c => c.consistent === null).length
  const judged = consistent + inconsistent
  if (judged === 0) return null

  const score = Math.round((consistent / judged) * 100)

  // Per-topic rollup with the judge's one-line notes
  const byTopic = {}
  for (const c of convictions) {
    const t = c.topic ?? 'OTHER'
    byTopic[t] ??= { topic: t, consistent: 0, inconsistent: 0, unclear: 0, notes: [] }
    if (c.consistent === true) byTopic[t].consistent++
    else if (c.consistent === false) byTopic[t].inconsistent++
    else byTopic[t].unclear++
    if (c.note) byTopic[t].notes.push({ label: c.label, consistent: c.consistent, note: c.note })
  }

  return {
    score,
    breakdown: {
      computedAt: new Date().toISOString(),
      checked: convictions.length,
      consistent,
      inconsistent,
      unclear,
      byTopic: Object.values(byTopic),
    },
  }
}

/** Compute and persist. Returns the saved result or null (no record). */
export async function scoreAndSaveRhetoric(candidateId) {
  const result = await computeRhetoricScore(candidateId)
  if (!result) return null
  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      rhetoricConsistencyScore: result.score,
      rhetoricBreakdown: result.breakdown,
    },
  })
  return result
}

/** Run for every candidate with a congressional record (bioguideId). */
export async function scoreAllIncumbents() {
  const incumbents = await prisma.candidate.findMany({
    where: { bioguideId: { not: null } },
    select: { id: true, firstName: true, lastName: true },
  })
  const summary = { scored: 0, skipped: 0, failed: 0 }
  for (const c of incumbents) {
    try {
      const r = await scoreAndSaveRhetoric(c.id)
      if (r) {
        summary.scored++
        console.log(`[rhetoric] ${c.firstName} ${c.lastName}: ${r.score}% (${r.breakdown.consistent}/${r.breakdown.consistent + r.breakdown.inconsistent} judged consistent)`)
      } else {
        summary.skipped++
      }
    } catch (err) {
      summary.failed++
      console.error(`[rhetoric] ${c.firstName} ${c.lastName} failed: ${err.message}`)
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  return summary
}
