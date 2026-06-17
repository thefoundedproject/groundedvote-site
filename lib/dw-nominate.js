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
 * DW-NOMINATE Calibration Module
 *
 * Fetches academic ideological scores from voteview.com to calibrate
 * AI-generated candidate positions. DW-NOMINATE (Dynamic Weighted Nominal
 * Three-Step Estimation) is the gold standard academic measure of
 * congressional ideology, covering every Congress since the 1st.
 *
 * dim1 score: -1.0 (most liberal/progressive) to +1.0 (most conservative)
 * dim2 score: secondary dimension (historically slavery/civil rights,
 *             now captures social/cultural conservatism vs. libertarianism)
 *
 * Use: for incumbents with a known bioguideId, pull their most recent
 * DW-NOMINATE scores and pass them into the AI evidence context. The AI
 * uses this as a calibration anchor â positions that strongly contradict
 * the academic score should carry lower confidence.
 */

const VOTEVIEW_BASE = 'https://voteview.com/api/v2'

/**
 * Fetch DW-NOMINATE scores for a member of Congress by bioguide ID.
 * Returns the most recent score object, or null if unavailable.
 *
 * @param {string} bioguideId â Congress.gov bioguide identifier (e.g. "B001286")
 * @returns {{ dim1, dim2, congress, extremity, label } | null}
 */
export async function getDWNominateScore(bioguideId) {
  if (!bioguideId) return null
  try {
    const url = `${VOTEVIEW_BASE}/legislators/?bioguide_id=${encodeURIComponent(bioguideId)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'GroundedVote/2.0 (https://groundedvote.com; civic-alignment-tool)',
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    const results = data?.results
    if (!Array.isArray(results) || results.length === 0) return null

    // Sort descending by congress number â most recent first
    const sorted = [...results].sort((a, b) => (b.congress || 0) - (a.congress || 0))
    const member = sorted[0]

    const dim1 = member?.nominate?.dim1
    if (dim1 === null || dim1 === undefined || isNaN(dim1)) return null

    const dim2 = member?.nominate?.dim2 ?? null

    return {
      dim1,
      dim2,
      congress: member.congress ?? null,
      // Ideological extremity: distance from the center (0)
      extremity: Math.abs(dim1),
      // Human-readable label for the AI prompt
      label: interpretDim1(dim1),
    }
  } catch {
    return null
  }
}

/**
 * Map dim1 score to a human-readable ideological label.
 * Thresholds based on Poole & Rosenthal (2007) and McCarty et al.
 */
function interpretDim1(score) {
  if (score <= -0.6) return 'strongly liberal/progressive'
  if (score <= -0.3) return 'liberal'
  if (score <= -0.1) return 'center-left'
  if (score < 0.1)   return 'moderate/centrist'
  if (score < 0.3)   return 'center-right'
  if (score < 0.6)   return 'conservative'
  return 'strongly conservative'
}

/**
 * Format DW-NOMINATE data as plain text for inclusion in the AI evidence prompt.
 * Written to be understood by the model as an anchor, not a direct answer.
 *
 * @param {{ dim1, dim2, congress, extremity, label } | null} score
 * @returns {string | null}
 */
export function formatDWNominateContext(score) {
  if (!score) return null

  const congStr = score.congress ? `${score.congress}th Congress` : 'most recent Congress'
  const dim2note = score.dim2 !== null && score.dim2 !== undefined
    ? `\n  Secondary dimension (social/cultural): ${score.dim2.toFixed(3)}`
    : ''

  return [
    `DW-NOMINATE Academic Ideological Score (voteview.com â ${congStr}):`,
    `  Primary dimension (liberal â conservative): ${score.dim1.toFixed(3)} â classified as: ${score.label}`,
    `  Scale: -1.0 = most liberal, 0.0 = centrist, +1.0 = most conservative${dim2note}`,
    `  Ideological extremity from center: ${score.extremity.toFixed(3)} (higher = more extreme)`,
    ``,
    `  Calibration guidance for AI scoring:`,
    `  - This score reflects the member's overall voting pattern across ALL roll-call votes.`,
    `  - A candidate with dim1 = ${score.dim1.toFixed(3)} (${score.label}) should generally`,
    `    score toward the ${score.dim1 < 0 ? 'support' : 'oppose'} end on progressive-framed questions`,
    `    and toward the ${score.dim1 >= 0 ? 'support' : 'oppose'} end on conservative-framed questions.`,
    `  - If direct evidence (PCT, voting record) strongly contradicts this baseline on a specific`,
    `    issue, trust the direct evidence. DW-NOMINATE is a general signal, not issue-specific.`,
    `  - Assign lower confidence to any position that sharply contradicts this ideological baseline`,
    `    without direct evidence explaining the divergence.`,
  ].join('\n')
}

/**
 * Convert a DW-NOMINATE dim1 score to a rough 1â5 directional scale.
 * This is for reference only â do NOT use as a direct answerValue.
 * It indicates the ideological direction, not a position on a specific question.
 *
 * -1.0 â 1 (most liberal direction)
 *  0.0 â 3 (centrist)
 * +1.0 â 5 (most conservative direction)
 *
 * @param {number} dim1
 * @returns {number} integer 1â5
 */
export function dim1ToDirectionalScale(dim1) {
  const clamped = Math.max(-1, Math.min(1, dim1))
  return Math.round(((clamped + 1) / 2) * 4 + 1)
}
