/**
 * Civic Alignment Matching Algorithm
 *
 * Computes how closely each candidate's positions match a user's answers.
 * Uses weighted cosine-similarity on a 5-point agree/disagree scale.
 * User importance weights (1-3) are applied per-question, inspired by ISideWith.
 *
 * Discriminative weighting (v2): questions where candidates diverge more
 * are amplified automatically. If a moderate Democrat sits at 3 and a
 * progressive sits at 5 on the same issue, that question gets up to 2x
 * the weight — so a user who answers 5 will be pulled strongly toward
 * the candidate whose actual position matches. Questions where all
 * candidates cluster together (everyone says 4) count less, because
 * they don't differentiate ideology.
 */

import { prisma } from './prisma.js'

// Map user importance (1-3) to a multiplier used in scoring.
// "Not a priority" = 0.33x, "Somewhat" = 1x, "Very important" = 2.5x
const IMPORTANCE_MULTIPLIER = { 1: 0.33, 2: 1.0, 3: 2.5 }

// PolicyTopic enum → Civic Mirror issue keys (Quiz 1 Q2/Q3 values).
// Topics without a mapping get no salience boost.
const TOPIC_TO_ISSUE = {
  ECONOMY: 'economy',
  HEALTHCARE: 'healthcare',
  ENVIRONMENT: 'environment',
  IMMIGRATION: 'immigration',
  GUN_POLICY: 'guns',
  TAXES: 'taxes',
  FOREIGN_POLICY: 'foreign_policy',
  VOTING_RIGHTS: 'democracy',
}

/**
 * Compute alignment scores for a completed quiz session.
 * Accepts an optional importanceMap: { [questionId]: 1 | 2 | 3 }
 * Returns scores 0-100 for each candidate, sorted descending.
 */
export async function computeAlignment(sessionId, importanceMap = {}) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      userAnswers: {
        include: {
          question: {
            include: { candidateAnswers: true },
          },
        },
      },
      race: {
        include: { candidates: true },
      },
    },
  })

  if (!session) throw new Error(`Session ${sessionId} not found`)

  // Civic Mirror weighting (signed-in users): issue salience from Quiz 1
  // (primary 1.0, secondary 0.75) scaled by the conviction factor from Q1.
  // A question on the user's primary issue at full conviction gets 2x.
  let salienceByIssue = {}
  let convictionFactor = 0
  if (session.userId) {
    const [priorities, mirror] = await Promise.all([
      prisma.issuePriority.findMany({ where: { userId: session.userId } }),
      prisma.civicMirrorResult.findUnique({ where: { userId: session.userId } }),
    ])
    salienceByIssue = Object.fromEntries(priorities.map(p => [p.issue, p.weight]))
    convictionFactor = mirror?.profile?.convictionFactor ?? 0.85
  }

  const candidates = session.race.candidates
  const userAnswers = session.userAnswers

  const scores = {}
  const weightTotals = {}
  candidates.forEach(c => {
    scores[c.id] = 0
    weightTotals[c.id] = 0
  })

  for (const userAnswer of userAnswers) {
    const question = userAnswer.question

    // Combine question weight (from bias-audit) × user importance multiplier
    const importanceVal = importanceMap[question.id] ?? userAnswer.importance ?? 2
    const importanceMult = IMPORTANCE_MULTIPLIER[importanceVal] ?? 1.0

    // Discriminative multiplier: how far apart are candidates on this question?
    // spread 0 (everyone agrees) → 1.0x; spread 4 (full range 1–5) → 2.0x
    // This pulls scores toward the candidate whose actual ideology matches the user,
    // and prevents consensus questions from drowning out differentiating ones.
    const candidateValues = question.candidateAnswers.map(ca => ca.answerValue)
    const spread = candidateValues.length > 1
      ? Math.max(...candidateValues) - Math.min(...candidateValues)
      : 0
    const discriminativeMult = 1 + spread / 4 // 1.0 – 2.0×

    // Civic Mirror salience: 1.0x (unlisted issue) up to 2.0x
    // (primary issue × full conviction)
    const issueKey = TOPIC_TO_ISSUE[question.topic]
    const salience = issueKey ? (salienceByIssue[issueKey] ?? 0) : 0
    const salienceMult = 1 + salience * convictionFactor

    const effectiveWeight = question.weight * importanceMult * discriminativeMult * salienceMult

    for (const candidateAnswer of question.candidateAnswers) {
      const cId = candidateAnswer.candidateId
      if (!(cId in scores)) continue

      const diff = Math.abs(userAnswer.answerValue - candidateAnswer.answerValue)
      const similarity = 1 - diff / 4

      scores[cId] += similarity * effectiveWeight * candidateAnswer.confidence
      weightTotals[cId] += effectiveWeight * candidateAnswer.confidence
    }
  }

  const normalized = candidates.map(c => ({
    candidateId: c.id,
    candidateName: `${c.firstName} ${c.lastName}`,
    alignmentScore: weightTotals[c.id] > 0
      ? Math.round((scores[c.id] / weightTotals[c.id]) * 100)
      : 0,
    // keep score as alias for backwards compat
    score: weightTotals[c.id] > 0
      ? Math.round((scores[c.id] / weightTotals[c.id]) * 100)
      : 0,
  })).sort((a, b) => b.alignmentScore - a.alignmentScore)

  // Top issues — where did user diverge most from their closest match?
  const topCandidateId = normalized[0]?.candidateId
  const topIssues = userAnswers
    .map(ua => {
      const topCA = ua.question.candidateAnswers.find(ca => ca.candidateId === topCandidateId)
      const deviation = topCA ? Math.abs(ua.answerValue - topCA.answerValue) : null
      return {
        topic: ua.question.topic,
        questionText: ua.question.questionText,
        userValue: ua.answerValue,
        candidateValue: topCA?.answerValue ?? null,
        deviation,
        weight: ua.question.weight,
      }
    })
    .sort((a, b) => (b.deviation ?? 0) - (a.deviation ?? 0))

  return { scores: normalized, topIssues }
}

/**
 * Save alignment result to the database.
 */
export async function saveResult(sessionId, { scores, topIssues }) {
  const scoresJson = JSON.stringify(scores)
  return prisma.quizResult.upsert({
    where: { sessionId },
    create: { sessionId, scores, scoresJson, topIssues },
    update: { scores, scoresJson, topIssues },
  })
}
