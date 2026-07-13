// © 2025 The Founded Project LLC — All rights reserved.
// app/candidates/[id]/page.js
// Personalized candidate profile — surfaces positions on user's top-weighted
// issues when arriving from the results page via ?session=<sessionId>.

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCandidatePhotoUrl, getCandidateInitials } from '@/lib/candidate-photo'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const c = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: { race: { select: { label: true, state: true } } },
  })
  if (!c) return { title: 'Candidate Not Found | GroundedVote' }
  return {
    title: `${c.firstName} ${c.lastName} — ${c.race?.label ?? 'Candidate'} | GroundedVote`,
    description: `View ${c.firstName} ${c.lastName}'s AI-extracted policy positions for the ${c.race?.label ?? 'race'} on GroundedVote.`,
    openGraph: {
      title: `${c.firstName} ${c.lastName} | GroundedVote`,
      description: `Bias-audited policy positions for ${c.firstName} ${c.lastName}.`,
    },
  }
}

// ─── constants ────────────────────────────────────────────────────────────────

const EVIDENCE_LABELS = {
  VOTING_RECORD:    'Voting Record',
  PUBLIC_STATEMENT: 'Public Statement',
  CAMPAIGN_PLATFORM:'Campaign Platform',
  PARTY_INFERENCE:  'Party Inference',
}
const EVIDENCE_COLORS = {
  VOTING_RECORD:    '#5ECFA6',
  PUBLIC_STATEMENT: '#D8AB69',
  CAMPAIGN_PLATFORM:'rgba(216,171,105,0.6)',
  PARTY_INFERENCE:  'rgba(245,240,232,0.3)',
}
const ANSWER_LABELS = {
  1: 'Strongly Oppose', 2: 'Oppose', 3: 'Neutral',
  4: 'Support',         5: 'Strongly Support',
}
const ANSWER_COLORS = {
  1: '#C0392B', 2: '#E67E22', 3: '#7F8C8D',
  4: '#27AE60', 5: '#1ABC9C',
}
const PARTY_COLORS = { D: '#4A90D9', R: '#D9534A', I: '#9B7BD9', G: '#5ECF8A', L: '#D9AB4A' }
const TOPIC_LABELS = {
  HEALTHCARE:       'Healthcare',      ECONOMY:        'Economy',
  IMMIGRATION:      'Immigration',     ENVIRONMENT:    'Environment',
  EDUCATION:        'Education',       HOUSING:        'Housing',
  CRIMINAL_JUSTICE: 'Criminal Justice',FOREIGN_POLICY: 'Foreign Policy',
  VOTING_RIGHTS:    'Voting Rights',   SOCIAL_SECURITY:'Social Security',
  DRUG_POLICY:      'Drug Policy',     GUN_POLICY:     'Gun Policy',
  LABOR:            'Labor',           TAXES:          'Taxes',
  VETERANS:         'Veterans',        INFRASTRUCTURE: 'Infrastructure',
  TECHNOLOGY:       'Technology',      OTHER:          'Other',
}
const TOPIC_ICONS = {
  HEALTHCARE: '♥', ECONOMY: '●', IMMIGRATION: '▶',
  ENVIRONMENT: '◆', EDUCATION: '■', HOUSING: '▪',
  CRIMINAL_JUSTICE: '▲', FOREIGN_POLICY: '▽', VOTING_RIGHTS: '◇',
  SOCIAL_SECURITY: '◈', DRUG_POLICY: '◊', GUN_POLICY: '□',
  LABOR: '⚐', TAXES: '⚑', VETERANS: '★',
  INFRASTRUCTURE: '△', TECHNOLOGY: '○', OTHER: '◌',
}

const S = {
  bg:     '#0F1B1F',
  bgCard: 'rgba(255,255,255,0.03)',
  bgPersonalized: 'rgba(94,207,166,0.04)',
  gold:   '#D8AB69',
  teal:   '#5ECFA6',
  text:   '#F5F0E8',
  muted:  'rgba(245,240,232,0.5)',
  faint:  'rgba(245,240,232,0.12)',
  border: 'rgba(216,171,105,0.15)',
  tealBorder: 'rgba(94,207,166,0.25)',
}

// ─── data fetch ───────────────────────────────────────────────────────────────

async function getCandidate(id) {
  return prisma.candidate.findUnique({
    where: { id },
    include: {
      race: { select: { id: true, label: true, state: true, stateFull: true, chamber: true, year: true } },
      quizAnswers: {
        include: { question: { select: { questionText: true, topic: true, weight: true } } },
        orderBy: { question: { weight: 'desc' } },
      },
    },
  })
}

// Fetch user's top issues from a quiz session — used for personalization.
// Returns [] gracefully on any failure (missing session, invalid JSON, etc.)
async function getUserTopIssues(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) return []
  try {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { result: { select: { topIssues: true } } },
    })
    if (!session?.result?.topIssues) return []
    const raw = session.result.topIssues
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed.slice(0, 5) : []
  } catch { return [] }
}

// ─── component helpers ────────────────────────────────────────────────────────

function AnswerBar({ value }) {
  const pct   = ((value - 1) / 4) * 100
  const color = ANSWER_COLORS[value] ?? S.muted
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: S.faint, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
      </div>
      <span style={{ color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 110 }}>
        {ANSWER_LABELS[value] ?? 'Unknown'}
      </span>
    </div>
  )
}

function EvidenceBadge({ type }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
      padding: '2px 6px', borderRadius: 3,
      border: `1px solid ${EVIDENCE_COLORS[type] ?? S.faint}`,
      color: EVIDENCE_COLORS[type] ?? S.muted,
      textTransform: 'uppercase',
    }}>
      {EVIDENCE_LABELS[type] ?? type}
    </span>
  )
}

function PartyBadge({ party, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      backgroundColor: `${color}22`, border: `1px solid ${color}55`,
      color, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
    }}>
      {party === 'D' ? 'Democrat' : party === 'R' ? 'Republican'
        : party === 'I' ? 'Independent' : party}
    </span>
  )
}

// Link a claim to the RhetoricalPoints fact-checker (its /check page
// accepts ?q= and runs the claim on arrival). Clean URL handoff — the
// two platforms stay independent.
function factCheckUrl(claim) {
  return `https://rhetoricalpoints.com/check?q=${encodeURIComponent(claim)}`
}

// ─── record vs. rhetoric section ──────────────────────────────────────────────
// Plain-language consistency between stated positions and the voting
// record. No editorial judgment — counts, notes, and sources only.
function RecordVsRhetoric({ candidate, candidateName }) {
  const score = candidate.rhetoricConsistencyScore
  const bd = candidate.rhetoricBreakdown

  // Nothing to show for candidates with no congressional record
  if (!candidate.bioguideId) return null

  if (score === null || score === undefined || !bd) {
    return (
      <section style={{ marginBottom: 48, padding: '20px 24px', borderRadius: 10, backgroundColor: S.bgCard, border: `1px solid ${S.border}` }}>
        <h2 style={{ color: S.gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          Record vs. Rhetoric
        </h2>
        <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.65, margin: 0 }}>
          {candidateName} has a congressional voting record. The comparison between their stated positions and that record is still being computed — check back soon.
        </p>
      </section>
    )
  }

  const judged = bd.consistent + bd.inconsistent
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ color: S.gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
        Record vs. Rhetoric
      </h2>
      <div style={{ padding: '22px 24px', borderRadius: 10, backgroundColor: S.bgCard, border: `1px solid ${S.border}`, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ color: S.gold, fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{Math.round(score)}%</div>
          <p style={{ color: S.text, fontSize: 15, lineHeight: 1.6, margin: 0, flex: 1, minWidth: 240 }}>
            Of {candidateName}&apos;s stated positions that could be checked against their congressional voting record, {bd.consistent} of {judged} held up as consistent.
            {bd.unclear > 0 && ` ${bd.unclear} had too little voting evidence to judge either way.`}
          </p>
        </div>
        <p style={{ color: S.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
          Comparison of stated positions with recent recorded votes (Congress.gov), assessed by AI and shown with its working. Draw your own conclusion.
        </p>
      </div>

      {bd.byTopic?.filter(t => t.notes?.length).map(t => (
        <div key={t.topic} style={{ marginBottom: 10, padding: '14px 18px', borderRadius: 8, backgroundColor: S.bgCard, border: `1px solid ${S.faint}` }}>
          <p style={{ color: S.text, fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>
            {TOPIC_LABELS[t.topic] ?? t.topic}
            <span style={{ color: S.muted, fontWeight: 400, marginLeft: 8 }}>
              {t.consistent} consistent · {t.inconsistent} inconsistent{t.unclear > 0 ? ` · ${t.unclear} unclear` : ''}
            </span>
          </p>
          {t.notes.slice(0, 3).map((n, i) => (
            <p key={i} style={{ color: S.muted, fontSize: 12, lineHeight: 1.6, margin: '0 0 6px' }}>
              <span style={{ color: n.consistent === true ? S.teal : n.consistent === false ? '#E57373' : S.muted, fontWeight: 700, marginRight: 6 }}>
                {n.consistent === true ? '✓' : n.consistent === false ? '✗' : '·'}
              </span>
              {n.note}
              {' '}
              <a href={factCheckUrl(`${candidateName}: ${n.note}`)} target="_blank" rel="noopener noreferrer" style={{ color: S.gold, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Fact-check this →
              </a>
            </p>
          ))}
        </div>
      ))}
    </section>
  )
}

// ─── personalized "On Your Issues" section ────────────────────────────────────
// Shows candidate positions for the topics the user weighted most heavily.
// topIssues: [{ topic: PolicyTopic, userValue: 1-5, deviation: number }]
// answersByTopic: { [topic]: CandidateAnswer[] }

function OnYourIssues({ topIssues, answersByTopic, candidateName }) {
  if (!topIssues?.length) return null

  // Only render topics where this candidate actually has positions
  const relevantIssues = topIssues.filter(
    issue => (answersByTopic[issue.topic] ?? []).length > 0
  )
  if (!relevantIssues.length) return null

  return (
    <section style={{ marginBottom: 52 }}>

      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
      }}>
        <span style={{
          display: 'inline-block', width: 3, height: 20, borderRadius: 2,
          backgroundColor: S.teal, flexShrink: 0,
        }} />
        <h2 style={{
          color: S.teal, fontSize: 12, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0,
        }}>
          On Your Issues
        </h2>
      </div>
      <p style={{
        color: S.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 24px',
        paddingLeft: 13,
      }}>
        Based on your quiz, you ranked these issues as most important to you.
        Here is where {candidateName} stands.
      </p>

      {relevantIssues.map(issue => {
        const answers = answersByTopic[issue.topic] ?? []
        const userLabel = ANSWER_LABELS[issue.userValue] ?? 'Unknown'
        const userColor = ANSWER_COLORS[issue.userValue] ?? S.muted

        return (
          <div key={issue.topic} style={{
            marginBottom: 24, borderRadius: 10,
            backgroundColor: S.bgPersonalized,
            border: `1px solid ${S.tealBorder}`,
            overflow: 'hidden',
          }}>

            {/* Topic header row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '14px 18px 14px',
              borderBottom: `1px solid ${S.tealBorder}`,
              backgroundColor: 'rgba(94,207,166,0.06)',
            }}>
              <span style={{ color: S.teal, fontSize: 15 }}>
                {TOPIC_ICONS[issue.topic] ?? '●'}
              </span>
              <span style={{ color: S.text, fontSize: 14, fontWeight: 600, flex: 1 }}>
                {TOPIC_LABELS[issue.topic] ?? issue.topic}
              </span>
              <span style={{
                fontSize: 11, color: S.muted, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                You answered:&nbsp;
                <span style={{ color: userColor, fontWeight: 600 }}>{userLabel}</span>
              </span>
            </div>

            {/* Candidate answer cards */}
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {answers.map((ans, i) => (
                <div key={ans.id ?? i} style={{
                  padding: '14px 16px', borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${S.faint}`,
                }}>
                  <p style={{ color: S.text, fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
                    {ans.question?.questionText}
                  </p>
                  <AnswerBar value={ans.answerValue} />
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginTop: 10, flexWrap: 'wrap',
                  }}>
                    <EvidenceBadge type={ans.evidenceType} />
                    {ans.sourceNote && (
                      <span style={{ color: S.muted, fontSize: 11, fontStyle: 'italic' }}>
                        {ans.sourceNote}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function CandidatePage({ params, searchParams }) {
  const candidate = await getCandidate(params.id)
  if (!candidate) notFound()

  const c = candidate
  const partyColor = PARTY_COLORS[c.party] ?? S.muted
  const photoUrl   = getCandidatePhotoUrl(c)

  // Personalization: fetch user's top issues from quiz session if linked
  const sessionId    = searchParams?.session ?? null
  const topIssues    = await getUserTopIssues(sessionId)

  // Group all answers by topic (used for both sections)
  const answersByTopic = c.quizAnswers.reduce((acc, a) => {
    const t = a.question?.topic ?? 'OTHER'
    if (!acc[t]) acc[t] = []
    acc[t].push(a)
    return acc
  }, {})

  // Full topic list — exclude topics already featured in "On Your Issues"
  const featuredTopics = new Set(topIssues.map(i => i.topic))
  const allTopicKeys   = Object.keys(answersByTopic).sort()
  const remainingKeys  = topIssues.length
    ? allTopicKeys.filter(t => !featuredTopics.has(t))
    : allTopicKeys

  const totalAnswers   = c.quizAnswers.length
  const avgConfidence  = totalAnswers
    ? Math.round(c.quizAnswers.reduce((s, a) => s + (a.confidence ?? 0), 0) / totalAnswers * 100)
    : null

  const links = [
    c.website       && { label: 'Official Website', href: c.website,       icon: '↗' },
    c.ballotpediaUrl&& { label: 'Ballotpedia',       href: c.ballotpediaUrl,icon: '◎' },
    c.twitterUrl    && { label: 'X / Twitter',        href: c.twitterUrl,   icon: '■' },
  ].filter(Boolean)

  const candidateName = `${c.firstName} ${c.lastName}`

  return (
    <main style={{ backgroundColor: S.bg, minHeight: '100vh', color: S.text }}>

      {/* ── HERO ── */}
      <section style={{
        borderBottom: `1px solid ${S.border}`,
        padding: 'clamp(40px,7vh,80px) clamp(20px,5vw,64px)',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>

          {/* Back */}
          <Link href="/races" style={{
            color: S.muted, fontSize: 12, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 28,
            border: `1px solid ${S.faint}`, padding: '5px 12px', borderRadius: 20,
          }}>
            ← All Races
          </Link>

          {/* Identity row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

            {/* Avatar */}
            {photoUrl ? (
              <img src={photoUrl} alt={candidateName}
                style={{ width: 88, height: 88, borderRadius: 14, objectFit: 'cover',
                         flexShrink: 0, border: `2px solid ${partyColor}` }} />
            ) : (
              <div style={{
                width: 88, height: 88, borderRadius: 14, flexShrink: 0,
                backgroundColor: `${partyColor}22`, border: `2px solid ${partyColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: partyColor, fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>
                  {getCandidateInitials(c)}
                </span>
              </div>
            )}

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                flexWrap: 'wrap', marginBottom: 8,
              }}>
                <PartyBadge party={c.party} color={partyColor} />
                {c.incumbent && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                    padding: '3px 8px', borderRadius: 20,
                    backgroundColor: `${S.teal}18`, border: `1px solid ${S.teal}55`,
                    color: S.teal,
                  }}>
                    INCUMBENT
                  </span>
                )}
              </div>
              <h1 style={{
                color: S.text, fontSize: 'clamp(26px,4vw,24px)', fontWeight: 300,
                margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.15,
              }}>
                {c.firstName} <strong style={{ fontWeight: 700 }}>{c.lastName}</strong>
              </h1>
              <p style={{ color: S.muted, fontSize: 15, margin: '0 0 16px' }}>
                {c.race?.label ?? 'Unknown Race'} &middot; {c.race?.year ?? '2026'}
              </p>

              {/* External links */}
              {links.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {links.map(l => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                      style={{
                        color: S.gold, fontSize: 12, textDecoration: 'none',
                        border: `1px solid ${S.border}`, padding: '5px 12px', borderRadius: 20,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                      {l.icon} {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div style={{
        maxWidth: 820, margin: '0 auto',
        padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,64px)',
      }}>

        {/* ── BIO ── */}
        {c.bio && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{
              color: S.gold, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              About
            </h2>
            <p style={{
              color: S.text, fontSize: 16, lineHeight: 1.75, margin: 0,
              padding: '20px 24px', borderLeft: `3px solid ${S.gold}`,
              backgroundColor: S.bgCard, borderRadius: '0 8px 8px 0',
            }}>
              {c.bio}
            </p>
          </section>
        )}

        {/* ── DATA QUALITY STRIP ── */}
        {totalAnswers > 0 && (
          <section style={{
            marginBottom: 48, padding: '16px 20px', borderRadius: 10,
            backgroundColor: S.bgCard, border: `1px solid ${S.border}`,
            display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <div>
              <div style={{ color: S.text, fontSize: 22, fontWeight: 700 }}>{totalAnswers}</div>
              <div style={{ color: S.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Policy Positions</div>
            </div>
            {avgConfidence !== null && (
              <div>
                <div style={{ color: S.teal, fontSize: 22, fontWeight: 700 }}>{avgConfidence}%</div>
                <div style={{ color: S.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Avg Confidence</div>
              </div>
            )}
            <div>
              <div style={{ color: S.text, fontSize: 22, fontWeight: 700 }}>{allTopicKeys.length}</div>
              <div style={{ color: S.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Issue Areas</div>
            </div>
            <div style={{ flex: 1 }} />
            <Link href={`/align?race=${c.race?.id ?? ''}`}
              style={{
                backgroundColor: S.gold, color: '#0F1B1F', padding: '10px 20px',
                borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13,
                whiteSpace: 'nowrap',
              }}>
              {sessionId ? 'Retake Quiz →' : 'Find Your Alignment →'}
            </Link>
          </section>
        )}

        {/* ── RECORD VS. RHETORIC ── */}
        <RecordVsRhetoric candidate={c} candidateName={candidateName} />

        {/* ── PERSONALIZED: ON YOUR ISSUES ── */}
        <OnYourIssues
          topIssues={topIssues}
          answersByTopic={answersByTopic}
          candidateName={candidateName}
        />

        {/* ── FULL POLICY POSITIONS ── */}
        {allTopicKeys.length > 0 ? (
          <section>
            <h2 style={{
              color: S.gold, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              {topIssues.length > 0 ? 'All Positions' : 'Policy Positions'}
            </h2>

            {(topIssues.length > 0 ? remainingKeys : allTopicKeys).map(topic => (
              <div key={topic} style={{ marginBottom: 32 }}>
                {/* Topic header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 14, paddingBottom: 10,
                  borderBottom: `1px solid ${S.faint}`,
                }}>
                  <span style={{ color: S.gold, fontSize: 16 }}>{TOPIC_ICONS[topic] ?? '●'}</span>
                  <h3 style={{ color: S.text, fontSize: 15, fontWeight: 600, margin: 0, letterSpacing: '0.01em' }}>
                    {TOPIC_LABELS[topic] ?? topic}
                  </h3>
                  <span style={{ color: S.muted, fontSize: 12, marginLeft: 'auto' }}>
                    {answersByTopic[topic].length} position{answersByTopic[topic].length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Answers in this topic */}
                {answersByTopic[topic].map((ans, i) => (
                  <div key={ans.id ?? i} style={{
                    marginBottom: 14, padding: '16px 18px',
                    backgroundColor: S.bgCard, borderRadius: 8,
                    border: `1px solid ${S.faint}`,
                  }}>
                    <p style={{ color: S.text, fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
                      {ans.question?.questionText}
                    </p>
                    <AnswerBar value={ans.answerValue} />
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginTop: 10, flexWrap: 'wrap',
                    }}>
                      <EvidenceBadge type={ans.evidenceType} />
                      {ans.sourceNote && (
                        <span style={{ color: S.muted, fontSize: 11, fontStyle: 'italic' }}>
                          {ans.sourceNote}
                          {' '}
                          <a href={factCheckUrl(`${candidateName}: ${ans.sourceNote}`)} target="_blank" rel="noopener noreferrer" style={{ color: S.gold, textDecoration: 'none', fontStyle: 'normal', whiteSpace: 'nowrap' }}>
                            Fact-check this →
                          </a>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* If personalized and topics were featured above, show a divider note */}
            {topIssues.length > 0 && remainingKeys.length === 0 && (
              <p style={{ color: S.muted, fontSize: 13, fontStyle: 'italic', textAlign: 'center',
                          marginTop: 8, padding: '16px 0' }}>
                All available positions were covered in the "On Your Issues" section above.
              </p>
            )}
          </section>
        ) : (
          <section style={{
            textAlign: 'center', padding: '48px 24px',
            border: `1px dashed ${S.faint}`, borderRadius: 12,
          }}>
            <p style={{ color: S.muted, fontSize: 15, margin: '0 0 20px' }}>
              Policy positions are being extracted for this candidate.
            </p>
            <Link href={`/align?race=${c.race?.id ?? ''}`}
              style={{
                backgroundColor: S.gold, color: '#0F1B1F', padding: '12px 24px',
                borderRadius: 8, textDecoration: 'none', fontWeight: 700,
              }}>
              Take the Quiz Anyway →
            </Link>
          </section>
        )}

        {/* ── FOOTER NOTE ── */}
        <div style={{
          marginTop: 48, paddingTop: 24, borderTop: `1px solid ${S.faint}`,
          color: S.muted, fontSize: 12, lineHeight: 1.6,
        }}>
          Positions are AI-extracted from public sources and bias-audited by GroundedVote.
          Evidence types: Voting Record (highest confidence) → Party Inference (lowest).
          All data © 2025 The Founded Project LLC.
        </div>

      </div>
    </main>
  )
}
