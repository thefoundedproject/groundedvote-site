/**
 * Conviction Tracker
 * Compares a candidate's STATED positions (public statements, campaign
 * platform) against how they actually voted: recorded roll calls from
 * Voteview (lib/roll-calls.js).
 *
 * Positions labeled VOTING_RECORD are not checked: they were read from these
 * same votes, so they would always come out consistent. Party estimates are
 * not checked either: they are not the candidate's own words.
 */
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma.js'
import { formatVotes, getRecordedVotes, relevantVotes } from './roll-calls.js'

// Created on first use — module-scope construction crashes `next build`
// when ANTHROPIC_API_KEY is absent.
let _client
const client = () => (_client ??= new Anthropic())

/**
 * For each stated position, check whether the member's recorded votes are
 * consistent with it.
 *
 * Returns an array of:
 * { questionId, label, consistent: true|false|null, note: string }
 */
export async function checkConvictions(candidateId) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      quizAnswers: {
        where: { evidenceType: { in: ['PUBLIC_STATEMENT', 'CAMPAIGN_PLATFORM'] }, question: { auditStatus: 'APPROVED' } },
        include: { question: { select: { id: true, questionText: true, weight: true, topic: true } } },
      },
    },
  })
  if (!candidate || !candidate.bioguideId || !candidate.quizAnswers.length) return []

  const votes = await getRecordedVotes(candidate.bioguideId)
  if (!votes.length) return []

  // Each position gets its own shortlist of related votes.
  const positions = candidate.quizAnswers.map(a => ({
      questionId: a.questionId,
      label: a.question.questionText,
      topic: a.question.topic,
      statedValue: a.answerValue, // 1–5
      statedNote: a.sourceNote,
      votes: formatVotes(relevantVotes(votes, a.question, { max: 15 })) || '  (no related recorded votes)',
    }))

  if (!positions.length) return []

  const prompt = `You are auditing a politician's stated positions against how they actually voted in Congress (recorded roll calls).

Candidate: ${candidate.firstName} ${candidate.lastName}

STATED POSITIONS (1=strongly oppose, 5=strongly support), each with the member's related recorded votes:
${positions.map((p, i) => `${i + 1}. questionId ${p.questionId}: "${p.label}" — stated value: ${p.statedValue}/5\n   Source of the stated position: ${p.statedNote ?? 'none'}\n${p.votes}`).join('\n\n')}

For each position, judge whether the votes listed under it are CONSISTENT or INCONSISTENT with the stated position.
Only a vote on a bill or amendment that itself enacts or blocks the asked policy counts. A vote on a different
policy in the same topic is not evidence; if no listed vote addresses the policy, the answer is UNCLEAR (null).
The note names the bill and how they voted.
"samePolicy" is true only when what the vote's measure does IS the question's policy (a voter-ID vote is not
automatic registration; a minimum-tax vote is not a corporate rate change; an EPA fee vote is not an emissions target).

Respond with a JSON array only — no prose:
[
  {"questionId": "...", "vote": "<bill number of the single most direct listed vote, or null>", "voteDoes": "<what that measure itself does, in a few words>", "samePolicy": true|false, "consistent": true|false|null, "note": "one sentence, max 25 words, naming the bill and the vote"}
]

Use null for unclear. questionId must match exactly.`

  try {
    const resp = await client().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      temperature: 0, // the same evidence should get the same verdict on every run
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content[0].text.trim()
    const jsonStart = text.indexOf('[')
    const jsonEnd = text.lastIndexOf(']') + 1
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd))

    // A verdict stands only on a named vote, from this position's own list,
    // whose measure is the asked policy; anything else is unclear.
    const norm = (t) => String(t ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    return parsed.map(item => {
      const pos = positions.find(p => p.questionId === item.questionId)
      const grounded = item.samePolicy === true && norm(item.vote) && norm(pos?.votes).includes(norm(item.vote))
      return {
        questionId: item.questionId,
        label: pos?.label ?? '',
        topic: pos?.topic ?? null,
        consistent: grounded ? item.consistent : null,
        note: item.note ?? '',
      }
    })
  } catch {
    return []
  }
}

/**
 * Lightweight summary for Results page:
 * Returns { consistent: N, inconsistent: N, unclear: N }
 */
export function summarizeConvictions(convictions) {
  return {
    consistent: convictions.filter(c => c.consistent === true).length,
    inconsistent: convictions.filter(c => c.consistent === false).length,
    unclear: convictions.filter(c => c.consistent === null).length,
  }
}
