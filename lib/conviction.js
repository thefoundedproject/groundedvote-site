/**
 * Conviction Tracker
 * Compares a candidate's assigned positions (from AI extraction) against their
 * actual Congressional voting record via Congress.gov.
 *
 * Returns per-question consistency badges shown on the Results page.
 */
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma.js'

// Created on first use — module-scope construction crashes `next build`
// when ANTHROPIC_API_KEY is absent.
let _client
const client = () => (_client ??= new Anthropic())

const CONGRESS_API_BASE = 'https://api.congress.gov/v3'
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY

/**
 * Fetch a member's legislative record: sponsored + cosponsored bills.
 * The Congress.gov API has no per-member votes endpoint (the old
 * `/member/{id}/votes` call 404'd, so this check silently never ran).
 * Bills a member introduced or signed onto are the per-member
 * behavioral record the API actually exposes.
 */
async function fetchMemberRecord(bioguideId) {
  if (!CONGRESS_API_KEY || !bioguideId) return []
  const grab = async (kind, field) => {
    try {
      const url = `${CONGRESS_API_BASE}/member/${bioguideId}/${kind}?limit=20&api_key=${CONGRESS_API_KEY}`
      const res = await fetch(url)
      if (!res.ok) return []
      const data = await res.json()
      return (data[field] ?? []).map(b => ({ ...b, _kind: kind === 'sponsored-legislation' ? 'sponsored' : 'cosponsored' }))
    } catch {
      return []
    }
  }
  const [sponsored, cosponsored] = await Promise.all([
    grab('sponsored-legislation', 'sponsoredLegislation'),
    grab('cosponsored-legislation', 'cosponsoredLegislation'),
  ])
  return [...sponsored, ...cosponsored]
}

/**
 * For each candidate position, check whether their voting record is
 * consistent with their stated position using Claude.
 *
 * Returns an array of:
 * { questionId, label, consistent: true|false|null, note: string }
 */
export async function checkConvictions(candidateId) {
  // Load candidate with their CandidateAnswer records (schema relation: quizAnswers).
  // Exclude PARTY_INFERENCE — those positions have no voting record to check against.
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      quizAnswers: {
        where: { evidenceType: { not: 'PARTY_INFERENCE' } },
        include: { question: { select: { id: true, questionText: true, weight: true, topic: true } } },
      },
    },
  })
  if (!candidate || !candidate.bioguideId) return []

  const record = await fetchMemberRecord(candidate.bioguideId)
  if (!record.length) return []

  // Format the legislative record for the prompt
  const voteSummary = record
    .slice(0, 25)
    .map(b => `- [${b._kind}] ${b.title ?? 'Unknown bill'} (${b.policyArea?.name ?? 'General'})`)
    .join('\n')

  // Build position list
  const positions = candidate.quizAnswers.map(a => ({
      questionId: a.questionId,
      label: a.question.questionText,
      topic: a.question.topic,
      statedValue: a.answerValue, // 1–5
      statedNote: a.sourceNote,
    }))

  if (!positions.length) return []

  const prompt = `You are auditing a politician's stated positions against their actual Congressional legislative record — the bills they introduced (sponsored) or signed onto (cosponsored).

Candidate: ${candidate.firstName} ${candidate.lastName}

LEGISLATIVE RECORD:
${voteSummary}

STATED POSITIONS (1=strongly oppose, 5=strongly support):
${positions.map((p, i) => `${i + 1}. "${p.label}" — stated value: ${p.statedValue}/5\n   Source note: ${p.statedNote ?? 'none'}`).join('\n')}

For each position, assess whether the legislative record is CONSISTENT, INCONSISTENT, or UNCLEAR (too little evidence).

Respond with a JSON array only — no prose:
[
  {"questionId": "...", "consistent": true|false|null, "note": "one sentence explanation max 20 words"}
]

Use null for unclear. questionId must match exactly.`

  try {
    const resp = await client().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = resp.content[0].text.trim()
    const jsonStart = text.indexOf('[')
    const jsonEnd = text.lastIndexOf(']') + 1
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd))

    // Merge with question labels
    return parsed.map(item => {
      const pos = positions.find(p => p.questionId === item.questionId)
      return {
        questionId: item.questionId,
        label: pos?.label ?? '',
        topic: pos?.topic ?? null,
        consistent: item.consistent,
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
