// &#169; 2025 The Founded Project LLC &#8212; All rights reserved.
// app/candidates/[id]/page.js

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
    title: `${c.firstName} ${c.lastName} &#8212; ${c.race?.label ?? 'Candidate'} | GroundedVote`,
    description: `View ${c.firstName} ${c.lastName}'s AI-extracted policy positions for the ${c.race?.label ?? 'race'} on GroundedVote.`,
    openGraph: {
      title: `${c.firstName} ${c.lastName} | GroundedVote`,
      description: `Bias-audited policy positions for ${c.firstName} ${c.lastName}.`,
    },
  }
}

// &#9472;&#9472;&#9472; constants &#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;

const EVIDENCE_LABELS = {
  VOTING_RECORD:      'Voting Record',
  PUBLIC_STATEMENT:   'Public Statement',
  CAMPAIGN_PLATFORM:  'Campaign Platform',
  PARTY_INFERENCE:    'Party Inference',
}
const EVIDENCE_COLORS = {
  VOTING_RECORD:      '#5ECFA6',
  PUBLIC_STATEMENT:   '#D8AB69',
  CAMPAIGN_PLATFORM:  'rgba(216,171,105,0.6)',
  PARTY_INFERENCE:    'rgba(245,240,232,0.3)',
}
const ANSWER_LABELS = {
  1: 'Strongly Oppose', 2: 'Oppose', 3: 'Neutral',
  4: 'Support', 5: 'Strongly Support',
}
const ANSWER_COLORS = {
  1: '#C0392B', 2: '#E67E22', 3: '#7F8C8D',
  4: '#27AE60', 5: '#1ABC9C',
}
const PARTY_COLORS  = { D: '#4A90D9', R: '#D9534A', I: '#9B7BD9', G: '#5ECF8A', L: '#D9AB4A' }
const TOPIC_LABELS  = {
  HEALTHCARE: 'Healthcare', ECONOMY: 'Economy', IMMIGRATION: 'Immigration',
  ENVIRONMENT: 'Environment', EDUCATION: 'Education', HOUSING: 'Housing',
  CRIMINAL_JUSTICE: 'Criminal Justice', FOREIGN_POLICY: 'Foreign Policy',
  VOTING_RIGHTS: 'Voting Rights', SOCIAL_SECURITY: 'Social Security',
  DRUG_POLICY: 'Drug Policy', GUN_POLICY: 'Gun Policy', LABOR: 'Labor',
  TAXES: 'Taxes', VETERANS: 'Veterans', INFRASTRUCTURE: 'Infrastructure',
  TECHNOLOGY: 'Technology', OTHER: 'Other',
}
const TOPIC_ICONS = {
  HEALTHCARE: '&#9829;', ECONOMY: '&#9679;', IMMIGRATION: '&#9654;',
  ENVIRONMENT: '&#9670;', EDUCATION: '&#9632;', HOUSING: '&#9642;',
  CRIMINAL_JUSTICE: '&#9650;', FOREIGN_POLICY: '&#9661;', VOTING_RIGHTS: '&#9671;',
  SOCIAL_SECURITY: '&#9672;', DRUG_POLICY: '&#9674;', GUN_POLICY: '&#9633;',
  LABOR: '&#9686;', TAXES: '&#9687;', VETERANS: '&#9733;',
  INFRASTRUCTURE: '&#9651;', TECHNOLOGY: '&#9675;', OTHER: '&#9676;',
}

const S = {
  bg: '#0F1B1F', bgCard: 'rgba(255,255,255,0.03)',
  gold: '#D8AB69', teal: '#5ECFA6', text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)', faint: 'rgba(245,240,232,0.12)',
  border: 'rgba(216,171,105,0.15)',
}

// &#9472;&#9472;&#9472; data fetch &#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;

async function getCandidate(id) {
  return prisma.candidate.findUnique({
    where: { id },
    include: {
      race: { select: { id: true, label: true, state: true, stateFull: true, chamber: true, year: true } },
      answers: {
        include: { question: { select: { questionText: true, topic: true, weight: true } } },
        orderBy: { question: { weight: 'desc' } },
      },
    },
  })
}

// &#9472;&#9472;&#9472; helpers &#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;

function AnswerBar({ value }) {
  const pct = ((value - 1) / 4) * 100
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
      {party === 'D' ? 'Democrat' : party === 'R' ? 'Republican' : party === 'I' ? 'Independent' : party}
    </span>
  )
}

// &#9472;&#9472;&#9472; page &#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;

export default async function CandidatePage({ params }) {
  const candidate = await getCandidate(params.id)
  if (!candidate) notFound()

  const c = candidate
  const partyColor = PARTY_COLORS[c.party] ?? S.muted
  const photoUrl   = getCandidatePhotoUrl(c)

  // Group answers by topic
  const byTopic = c.answers.reduce((acc, a) => {
    const t = a.question?.topic ?? 'OTHER'
    if (!acc[t]) acc[t] = []
    acc[t].push(a)
    return acc
  }, {})

  const topicKeys  = Object.keys(byTopic).sort()
  const totalAnswers = c.answers.length
  const avgConfidence = totalAnswers
    ? Math.round(c.answers.reduce((s, a) => s + (a.confidence ?? 0), 0) / totalAnswers * 100)
    : null

  // Social / external links
  const links = [
    c.website       && { label: 'Official Website', href: c.website,       icon: '&#8599;' },
    c.ballotpediaUrl && { label: 'Ballotpedia',     href: c.ballotpediaUrl, icon: '&#9678;' },
    c.twitterUrl    && { label: 'X / Twitter',      href: c.twitterUrl,     icon: '&#9632;' },
  ].filter(Boolean)

  return (
    <main style={{ backgroundColor: S.bg, minHeight: '100vh', color: S.text }}>

      {/* &#9472;&#9472; HERO &#9472;&#9472; */}
      <section style={{ borderBottom: `1px solid ${S.border}`, padding: 'clamp(40px,7vh,80px) clamp(20px,5vw,64px)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>

          {/* Back */}
          <Link href="/races" style={{ color: S.muted, fontSize: 12, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 28,
            border: `1px solid ${S.faint}`, padding: '5px 12px', borderRadius: 20 }}>
            &#8592; All Races
          </Link>

          {/* Identity row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

            {/* Avatar */}
            {photoUrl ? (
              <img src={photoUrl} alt={`${c.firstName} ${c.lastName}`}
                style={{ width: 88, height: 88, borderRadius: 14, objectFit: 'cover',
                  flexShrink: 0, border: `2px solid ${partyColor}` }} />
            ) : (
              <div style={{ width: 88, height: 88, borderRadius: 14, flexShrink: 0,
                backgroundColor: `${partyColor}22`, border: `2px solid ${partyColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: partyColor, fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>
                  {getCandidateInitials(c)}
                </span>
              </div>
            )}

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <PartyBadge party={c.party} color={partyColor} />
                {c.incumbent && (
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                    padding: '3px 8px', borderRadius: 20, backgroundColor: `${S.teal}18`,
                    border: `1px solid ${S.teal}55`, color: S.teal }}>
                    INCUMBENT
                  </span>
                )}
              </div>
              <h1 style={{ color: S.text, fontSize: 'clamp(26px,4vw,24px)', fontWeight: 300,
                margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
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
                      style={{ color: S.gold, fontSize: 12, textDecoration: 'none',
                        border: `1px solid ${S.border}`, padding: '5px 12px', borderRadius: 20,
                        display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {l.icon} {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,64px)' }}>

        {/* &#9472;&#9472; BIL &#9472;&#9472; */}
        {c.bio && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ color: S.gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 16 }}>About</h2>
            <p style={{ color: S.text, fontSize: 16, lineHeight: 1.75, margin: 0,
              padding: '20px 24px', borderLeft: `3px solid ${S.gold}`,
              backgroundColor: S.bgCard, borderRadius: '0 8px 8px 0' }}>
              {c.bio}
            </p>
          </section>
        )}

        {/* &#9472;&#9472; DATA QUALITY &#9472;&#9472; */}
        {totalAnswers > 0 && (
          <section style={{ marginBottom: 48, padding: '16px 20px', borderRadius: 10,
            backgroundColor: S.bgCard, border: `1px solid ${S.bor${S.border}`,
            display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
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
              <div style={{ color: S.text, fontSize: 22, fontWeight: 700 }}>{topicKeys.length}</div>
              <div style={{ color: S.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Issue Areas</div>
            </div>
            <div style={{ flex: 1 }} />
            <Link href={`/align?race=${c.race?.id ?? ''}`}
              style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '10px 20px',
                borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13,
                whiteSpace: 'nowrap' }}>
              Find Your Alignment &#8594;
            </Link>
          </section>
        )}

        {/* &#9472;&#9472; POLICY POSITIONS &#9472;&#9472; */}
        {topicKeys.length > 0 ? (
          <section>
            <h2 style={{ color: S.gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 24 }}>Policy Positions</h2>

            {topicKeys.map(topic => (
              <div key={topic} style={{ marginBottom: 32 }}>
                {/* Topic header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                  paddingBottom: 10, borderBottom: `1px solid ${S.faint}` }}>
                  <span style={{ color: S.gold, fontSize: 16 }}>{TOPIC_ICONS[topic] ?? '&#9679;'}</span>
                  <h3 style={{ color: S.text, fontSize: 15, fontWeight: 600, margin: 0, letterSpacing: '0.01em' }}>
                    {TOPIC_LABELS[topic] ?? topic}
                  </h3>
                  <span style={{ color: S.muted, fontSize: 12, marginLeft: 'auto' }}>
                    {byTopic[topic].length} position{byTopic[topic].length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Answers in this topic */}
                {byTopic[topic].map((ans, i) => (
                  <div key={ans.id ?? i} style={{ marginBottom: 14, padding: '16px 18px',
                    backgroundColor: S.bgCard, borderRadius: 8, border: `1px solid ${S.faint}` }}>
                    <p style={{ color: S.text, fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
                      {ans.question?.questionText}
                    </p>
                    <AnswerBar value={ans.answerValue} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
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
            ))}
          </section>
        ) : (
          <section style={{ textAlign: 'center', padding: '48px 24px',
            border: `1px dashed ${S.faint}`, borderRadius: 12 }}>
            <p style={{ color: S.muted, fontSize: 15, margin: '0 0 20px' }}>
              Policy positions are being extracted for this candidate.
            </p>
            <Link href={`/align?race=${c.race?.id ?? ''}`}
              style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '12px 24px',
                borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>
              Take the Quiz Anyway &#8594;
            </Link>
          </section>
        )}

        {/* &#9472;&#9472; FOOTER NOTE &#9472;&#9472; */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${S.faint}`,
          color: S.muted, fontSize: 12, lineHeight: 1.6 }}>
          Positions are AI-extracted from public sources and bias-audited by GroundedVote.
          Evidence types: Voting Record (highest confidence) &#8594; Party Inference (lowest).
          All data &copy; 2025 The Founded Project LLC.
        </div>

      </div>
    </main>
  )
}
