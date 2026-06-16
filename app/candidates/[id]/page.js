import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCandidatePhotoUrl, getCandidateInitials } from '@/lib/candidate-photo'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: { race: { select: { label: true, state: true } } },
  })
  if (!candidate) return { title: 'Candidate Not Found | GroundedVote' }
  return {
    title: `${candidate.firstName} ${candidate.lastName} — ${candidate.race?.label ?? 'Candidate'} | GroundedVote`,
    description: `View ${candidate.firstName} ${candidate.lastName}'s AI-extracted policy positions for the ${candidate.race?.label ?? 'race'} on GroundedVote.`,
    openGraph: {
      title: `${candidate.firstName} ${candidate.lastName} | GroundedVote`,
      description: `Bias-audited policy positions for ${candidate.firstName} ${candidate.lastName}.`,
    },
  }
}

const EVIDENCE_LABELS = {
  VOTING_RECORD: 'Voting Record',
  PUBLIC_STATEMENT: 'Public Statement',
  CAMPAIGN_PLATFORM: 'Campaign Platform',
  PARTY_INFERENCE: 'Party Inference',
}
const EVIDENCE_COLORS = {
  VOTING_RECORD: '#5ECFA6',
  PUBLIC_STATEMENT: '#D8AB69',
  CAMPAIGN_PLATFORM: 'rgba(216,171,105,0.6)',
  PARTY_INFERENCE: 'rgba(245,240,232,0.3)',
}
const ANSWER_LABELS = {
  1: 'Strongly Oppose', 2: 'Oppose', 3: 'Neutral / No Position', 4: 'Support', 5: 'Strongly Support',
}
const PARTY_COLORS = { D: '#4A90D9', R: '#D9534A', I: '#9B7BD9', G: '#5ECF8A', L: '#D9A84A' }

const S = {
  bg: '#0F1B1F', bgDark: '#060f11', bgCard: 'rgba(255,255,255,0.03)',
  gold: '#D8AB69', teal: '#5ECFA6', text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)', faint: 'rgba(245,240,232,0.25)',
  border: 'rgba(216,171,105,0.15)',
}

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

export default async function CandidatePage({ params }) {
  const candidate = await getCandidate(params.id)
  if (!candidate) notFound()

  const c = candidate
  const partyColor = PARTY_COLORS[c.party] ?? S.muted
  const byTopic = c.answers.reduce((acc, a) => {
    const t = a.question?.topic ?? 'OTHER'
    if (!acc[t]) acc[t] = []
    acc[t].push(a)
    return acc
  }, {})

  const avgConfidence = c.answers.length
    ? Math.round(c.answers.reduce((sum, a) => sum + (a.confidence ?? 0), 0) / c.answers.length * 100)
    : null

  return (
    <>
      {/* Hero */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(48px, 8vh, 96px) 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Link href="/races" style={{ color: S.muted, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            ← Back to races
          </Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
            {/* Photo or party indicator */}
            {getCandidatePhotoUrl(c) ? (
              <img
                src={getCandidatePhotoUrl(c)}
                alt={`${c.firstName} ${c.lastName}`}
                style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: `2px solid ${partyColor}` }}
              />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: `${partyColor}22`, border: `2px solid ${partyColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: partyColor, fontWeight: 800, fontSize: 24 }}>{c.party ?? '?'}</span>
              </div>
            )}
            <div>
              <h1 style={{ color: S.text, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 300, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {c.firstName} {c.lastName}
              </h1>
              <p style={{ color: S.muted, fontSize: 14, margin: 0 }}>
                {c.race?.label ?? 'Unknown Race'} · {c.race?.year ?? '2026'}
                {c.incumbent && <span style={{ marginLeft: 10, color: S.teal, fontSize: 12, fontWeight: 700 }}>INCUMBENT</span>}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { n: c.answers.length, label: 'Positions extracted' },
              avgConfidence !== null && { n: `${avgConfidence}%`, label: 'Avg. AI confidence' },
              c.bioguideId && { n: 'Yes', label: 'Voting record available' },
            ].filter(Boolean).map(({ n, label }) => (
              <div key={label}>
                <p style={{ color: S.gold, fontSize: 28, fontWeight: 700, margin: '0 0 2px', lineHeight: 1 }}>{n}</p>
                <p style={{ color: S.muted, fontSize: 12, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28 }}>
            <Link
              href="/align"
              style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '12px 24px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}
            >
              Take the quiz — see your match score →
            </Link>
          </div>
        </div>
      </section>

      {/* Positions */}
      <section style={{ backgroundColor: S.bgDark, padding: 'clamp(32px, 6vh, 72px) 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {c.answers.length === 0 ? (
            <p style={{ color: S.muted, fontSize: 15 }}>Position extraction pending. Check back soon.</p>
          ) : (
            <>
              <p style={{ color: S.faint, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 24 }}>
                AI-Extracted Positions · {c.answers.length} issues
              </p>
              {Object.entries(byTopic).map(([topic, answers]) => (
                <div key={topic} style={{ marginBottom: 36 }}>
                  <p style={{ color: S.teal, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                    {topic.replace(/_/g, ' ')}
                  </p>
                  {answers.map((a, i) => (
                    <div
                      key={i}
                      style={{ backgroundColor: S.bgCard, border: `1px solid ${S.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 8 }}
                    >
                      <p style={{ color: S.text, fontSize: 14, lineHeight: 1.55, margin: '0 0 10px' }}>
                        {a.question?.questionText}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ color: S.gold, fontSize: 13, fontWeight: 600 }}>
                          {ANSWER_LABELS[a.answerValue] ?? `Score: ${a.answerValue}`}
                        </span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {a.evidenceType && (
                            <span style={{
                              backgroundColor: `${EVIDENCE_COLORS[a.evidenceType]}22`,
                              color: EVIDENCE_COLORS[a.evidenceType],
                              border: `1px solid ${EVIDENCE_COLORS[a.evidenceType]}44`,
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                              padding: '3px 8px', borderRadius: 4,
                            }}>
                              {EVIDENCE_LABELS[a.evidenceType]}
                            </span>
                          )}
                          {a.confidence && (
                            <span style={{ color: S.faint, fontSize: 11 }}>
                              {Math.round(a.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                      </div>
                      {a.sourceNote && (
                        <p style={{ color: S.faint, fontSize: 12, lineHeight: 1.5, marginTop: 8, marginBottom: 0, fontStyle: 'italic' }}>
                          {a.sourceNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              <p style={{ color: S.faint, fontSize: 11, lineHeight: 1.65, marginTop: 32 }}>
                Positions extracted by AI and bias-audited. Confidence reflects evidence strength: voting record (85–95%), public statements (70–85%), campaign platform (60–75%), party inference (35–50%). <Link href="/methodology" style={{ color: S.gold, textDecoration: 'none' }}>Full methodology →</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </>
  )
}
