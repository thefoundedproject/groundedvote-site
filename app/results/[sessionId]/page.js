import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCandidatePhotoUrl } from '@/lib/candidate-photo'

export const revalidate = 3600

export async function generateMetadata({ params }) {
  const result = await getResult(params.sessionId)
  if (!result) return { title: 'Result Not Found | GroundedVote' }
  const top = result.scores?.[0]
  if (!top) return { title: 'GroundedVote Result' }
  const name = `${top.candidate.firstName} ${top.candidate.lastName}`
  const pct = Math.round(top.alignmentScore)
  const race = result.race?.label ?? 'this race'
  return {
    title: `${pct}% match with ${name} | GroundedVote`,
    description: `I'm a ${pct}% match with ${name} on the ${race}. No party labels — just issues. Find your match at GroundedVote.`,
    openGraph: {
      title: `${pct}% match with ${name}`,
      description: `Bias-audited civic alignment quiz · ${race} · groundedvote.com`,
      url: `https://groundedvote.com/results/${params.sessionId}`,
      images: [{ url: 'https://groundedvote.com/og-default.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pct}% match with ${name} | GroundedVote`,
      description: `No party labels. Just issues. Find yours: groundedvote.com/align`,
    },
  }
}

async function getResult(sessionId) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      race: { select: { id: true, label: true, state: true, stateFull: true, chamber: true, year: true } },
      result: true,
    },
  })
  if (!session?.result) return null

  let scores = []
  try { scores = JSON.parse(session.result.scoresJson) } catch { return null }

  // Hydrate candidate names
  const candidateIds = scores.map(s => s.candidateId)
  const candidates = await prisma.candidate.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, firstName: true, lastName: true, party: true, bioguideId: true, photoUrl: true, isIncumbent: true },
  })
  const candMap = Object.fromEntries(candidates.map(c => [c.id, c]))

  const hydratedScores = scores
    .map(s => ({ ...s, candidate: candMap[s.candidateId] ?? null }))
    .filter(s => s.candidate)
    .sort((a, b) => b.alignmentScore - a.alignmentScore)

  return { race: session.race, scores: hydratedScores, sessionId }
}

const MATCH_LABEL = s => s >= 80 ? 'Strong Match' : s >= 60 ? 'Good Match' : s >= 40 ? 'Partial Match' : 'Low Match'
const MATCH_COLOR = s => s >= 80 ? '#D8AB69' : s >= 60 ? 'rgba(216,171,105,0.7)' : s >= 40 ? 'rgba(216,171,105,0.45)' : 'rgba(245,240,232,0.3)'

const S = {
  bg: '#0F1B1F', bgDark: '#060f11', bgCard: 'rgba(255,255,255,0.04)',
  gold: '#D8AB69', teal: '#5ECFA6', text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)', faint: 'rgba(245,240,232,0.25)',
  border: 'rgba(216,171,105,0.15)',
}

export default async function ResultPage({ params }) {
  const result = await getResult(params.sessionId)
  if (!result) notFound()

  const { race, scores } = result
  const top = scores[0]
  const topScore = Math.round(top.alignmentScore)
  const topName = `${top.candidate.firstName} ${top.candidate.lastName}`
  const topPhoto = getCandidatePhotoUrl(top.candidate)

  return (
    <>
      {/* Hero result */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(48px, 8vh, 96px) 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 24 }}>
            Civic Alignment Result
          </p>

          {/* Top match avatar + score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            {topPhoto ? (
              <img src={topPhoto} alt={topName} style={{ width: 80, height: 80, borderRadius: 40, objectFit: 'cover', border: `3px solid ${S.gold}` }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(216,171,105,0.15)', border: `3px solid ${S.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: S.gold, fontWeight: 800, fontSize: 24 }}>{top.candidate.firstName?.[0]}{top.candidate.lastName?.[0]}</span>
              </div>
            )}
            <div>
              <p style={{ color: S.gold, fontSize: 56, fontWeight: 800, margin: 0, lineHeight: 1 }}>{topScore}%</p>
              <p style={{ color: S.text, fontSize: 22, fontWeight: 300, margin: '8px 0 4px' }}>match with {topName}</p>
              <p style={{ color: S.muted, fontSize: 14 }}>{race?.label ?? 'Unknown Race'} · {MATCH_LABEL(topScore)}</p>
            </div>
          </div>

          {/* Share / CTA */}
          <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.75, maxWidth: 440, margin: '0 auto 28px' }}>
            This result was generated by GroundedVote's bias-audited alignment quiz. No party labels — just issues that matter to you.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/align" style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '13px 28px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Take the quiz yourself →
            </a>
            <a href="/races" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: S.muted, padding: '13px 24px', borderRadius: 6, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: `1px solid ${S.border}` }}>
              Browse all races
            </a>
          </div>
        </div>
      </section>

      {/* All scores */}
      <section style={{ backgroundColor: S.bgDark, padding: 'clamp(32px, 5vh, 60px) 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ color: S.faint, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 20 }}>
            All Candidates · {race?.label}
          </p>
          {scores.map((s, i) => {
            const photo = getCandidatePhotoUrl(s.candidate)
            const score = Math.round(s.alignmentScore)
            const name = `${s.candidate.firstName} ${s.candidate.lastName}`
            return (
              <div key={s.candidateId} style={{ backgroundColor: i === 0 ? 'rgba(216,171,105,0.05)' : S.bgCard, border: `1.5px solid ${i === 0 ? 'rgba(216,171,105,0.3)' : S.border}`, borderRadius: 8, padding: '18px 22px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  {photo ? (
                    <img src={photo} alt={name} style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(216,171,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: S.gold, fontWeight: 700, fontSize: 13 }}>{s.candidate.firstName?.[0]}{s.candidate.lastName?.[0]}</span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ color: S.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{name}</p>
                    {i === 0 && <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '2px 0 0' }}>Closest Match</p>}
                  </div>
                  <p style={{ color: MATCH_COLOR(score), fontSize: 26, fontWeight: 700, margin: 0 }}>{score}%</p>
                </div>
                <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ width: `${score}%`, height: '100%', borderRadius: 2, backgroundColor: MATCH_COLOR(score) }} />
                </div>
                <p style={{ color: S.faint, fontSize: 11, marginTop: 6 }}>
                  {MATCH_LABEL(score)} · <Link href={`/candidates/${s.candidateId}`} style={{ color: S.gold, textDecoration: 'none' }}>View positions →</Link>
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Methodology note */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(32px, 5vh, 56px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p style={{ color: S.faint, fontSize: 13, lineHeight: 1.75, marginBottom: 16 }}>
            Scores reflect weighted cosine similarity between your answers and AI-extracted candidate positions. All questions are bias-audited before reaching users.
          </p>
          <Link href="/methodology" style={{ color: S.gold, fontSize: 13, textDecoration: 'none' }}>Full methodology →</Link>
        </div>
      </section>
    </>
  )
}
