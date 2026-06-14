/**
 * Civic Alignment Matching Algorithm
 *
 * Computes how closely each candidate's positions match a user's answers.
 * Uses weighted cosine-similarity on a 5-point agree/disagree scale.
 * User importance weights (1-3) are applied per-question, inspired by ISideWith.
 *
 * Issue pre-weighting: if the user completed the baseline civic quiz and declared
 * issue priorities, questions in those topic areas receive a minimum 2.5x multiplier
 * (the same as "Very important to me") regardless of per-question importance setting.
 */

import { prisma } from './prisma.js'

// Map user importance (1-3) to a multiplier used in scoring.
// "Not a priority" = 0.33x, "Somewhat" = 1x, "Very important" = 2.5x
const IMPORTANCE_MULTIPLIER = { 1: 0.33, 2: 1.0, 3: 2.5 }

// Maps baseline-quiz issue keys to database topic codes
const ISSUE_TO_TOPIC = {
  economy:        'ECONOMY',
  healthcare:     'HEALTHCARE',
  environment:    'ENVIRONMENT',
  immigration:    'IMMIGRATION',
  guns:           'GUN_POLICY',
  taxes:          'TAXES',
  foreign_policy: 'FOREIGN_POLICY',
  democracy:      'VOTING_RIGHTS',
}

/**
 * Compute alignment scores for a completed quiz session.
 *
 * @param {string} sessionId
 * @param {Object} importanceMap  { [questionId]: 1 | 2 | 3 }  per-question user ratings
 * @param {string[]} issuePriorities  issue keys from baseline quiz, e.g. ['economy','healthcare']
 */
export async function computeAlignment(sessionId, importanceMap = {}, issuePriorities = []) {
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

  const candidates = session.race.candidates
  const userAnswers = session.userAnswers

  // Build set of priority topic codes for O(1) lookup
  const priorityTopics = new Set(
    issuePriorities.map(k => ISSUE_TO_TOPIC[k]).filter(Boolean)
  )

  const scores = {}
  const weightTotals = {}
  candidates.forEach(c => {
    scores[c.id] = 0
    weightTotals[c.id] = 0
  })

  for (const userAnswer of userAnswers) {
    const question = userAnswer.question

    // Per-question importance: explicit map first, then stored value, then default
    const importanceVal = importanceMap[question.id] ?? userAnswer.importance ?? 2
    let importanceMult = IMPORTANCE_MULTIPLIER[importanceVal] ?? 1.0

    // Priority pre-weighting: baseline quiz priorities set a 2.5x floor
    // (matching the "Very important to me" tier for per-question weighting)
    if (priorityTopics.has(question.topic)) {
      importanceMult = Math.max(importanceMult, 2.5)
    }

    const effectiveWeight = question.weight * importanceMult

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

  // Top issues -- where did user diverge most from their closest match?
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
