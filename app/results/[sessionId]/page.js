// © 2025 The Founded Project LLC — All rights reserved.
// app/results/[sessionId]/page.js
// Updated: candidate "View positions" links now carry ?session=sessionId
// so the candidate profile page can load the user's personalized issue view.

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
  const pct  = Math.round(top.alignmentScore)
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
      race:   { select: { id: true, label: true, state: true, stateFull: true, chamber: true, year: true } },
      result: true,
      preQuizVote: true,
      measureAnswers: {
        include: { measure: { select: { title: true, yesPosition: true, sourceUrl: true } } },
      },
    },
  })
  if (!session?.result) return null

  let scores = []
  try { scores = JSON.parse(session.result.scoresJson) } catch { return null }

  // Hydrate candidate names
  const candidateIds = scores.map(s => s.candidateId)
  const candidates   = await prisma.candidate.findMany({
    where:  { id: { in: candidateIds } },
    select: { id: true, firstName: true, lastName: true, party: true, bioguideId: true, imageUrl: true, incumbent: true },
  })
  const candMap = Object.fromEntries(candidates.map(c => [c.id, c]))

  const hydratedScores = scores
    .map(s => ({ ...s, candidate: candMap[s.candidateId] ?? null }))
    .filter(s => s.candidate)
    .sort((a, b) => b.alignmentScore - a.alignmentScore)

  return {
    race: session.race,
    scores: hydratedScores,
    sessionId,
    preQuizVote: session.preQuizVote,
    measureAnswers: session.measureAnswers ?? [],
  }
}

function measureLeaning(v) {
  if (v >= 4) return { label: 'Your answer leans Yes', color: '#5ECFA6' }
  if (v <= 2) return { label: 'Your answer leans No', color: '#E57373' }
  return { label: 'No clear lean', color: 'rgba(245,240,232,0.5)' }
}

// Before/after reveal copy for the pre-quiz stated preference.
// Returns null when the question was skipped or never asked.
function buildReveal(preQuizVote, scores) {
  if (!preQuizVote || !scores.length) return null
  const top = scores[0]
  const topName = `${top.candidate.firstName} ${top.candidate.lastName}`
  const topScore = Math.round(top.alignmentScore)

  if (preQuizVote.candidateId) {
    const preEntry = scores.find(s => s.candidateId === preQuizVote.candidateId)
    const preName = preEntry ? `${preEntry.candidate.firstName} ${preEntry.candidate.lastName}` : 'your pick'
    const preScore = preEntry ? Math.round(preEntry.alignmentScore) : null
    if (preQuizVote.candidateId === top.candidateId) {
      return {
        heading: 'Your answers agree with you.',
        body: `Before the quiz, you said you would vote for ${preName}. Your answers point the same way: ${topName} is your closest match at ${topScore}%.`,
      }
    }
    return {
      heading: 'Your answers point somewhere else.',
      body: `Before the quiz, you said you would vote for ${preName}${preScore !== null ? `, who matched ${preScore}% of your answers` : ''}. Your closest match is ${topName} at ${topScore}%. The issue-by-issue view shows where the gap comes from.`,
    }
  }
  if (preQuizVote.rawText) {
    return {
      heading: 'What you said, next to what you showed.',
      body: `Before the quiz, you wrote "${preQuizVote.rawText}". Your answers put ${topName} closest at ${topScore}%.`,
    }
  }
  return null
}

const MATCH_LABEL = s => s >= 80 ? 'Strong Match' : s >= 60 ? 'Good Match' : s >= 40 ? 'Partial Match' : 'Low Match'
const MATCH_COLOR = s => s >= 80 ? '#D8AB69' : s >= 60 ? 'rgba(216,171,105,0.7)' : s >= 40 ? 'rgba(216,171,105,0.45)' : 'rgba(245,240,232,0.3)'

const S = {
  bg:     '#0F1B1F',
  bgDark: '#060f11',
  bgCard: 'rgba(255,255,255,0.04)',
  gold:   '#D8AB69',
  teal:   '#5ECFA6',
  text:   '#F5F0E8',
  muted:  'rgba(245,240,232,0.5)',
  faint:  'rgba(245,240,232,0.25)',
  border: 'rgba(216,171,105,0.15)',
}

export default async function ResultPage({ params }) {
  const result = await getResult(params.sessionId)
  if (!result) notFound()

  const { race, scores, preQuizVote, measureAnswers } = result
  const reveal   = buildReveal(preQuizVote, scores)
  const top      = scores[0]
  const topScore = Math.round(top.alignmentScore)
  const topName  = `${top.candidate.firstName} ${top.candidate.lastName}`
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
              <img src={topPhoto} alt={topName}
                style={{ width: 80, height: 80, borderRadius: 40, objectFit: 'cover', border: `3px solid ${S.gold}` }} />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: 'rgba(216,171,105,0.15)', border: `3px solid ${S.gold}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: S.gold, fontWeight: 800, fontSize: 24 }}>
                  {top.candidate.firstName?.[0]}{top.candidate.lastName?.[0]}
                </span>
              </div>
            )}
            <div>
              <p style={{ color: S.gold, fontSize: 56, fontWeight: 800, margin: 0, lineHeight: 1 }}>{topScore}%</p>
              <p style={{ color: S.text, fontSize: 22, fontWeight: 300, margin: '8px 0 4px' }}>match with {topName}</p>
              <p style={{ color: S.muted, fontSize: 14 }}>{race?.label ?? 'Unknown Race'} · {MATCH_LABEL(topScore)}</p>
            </div>
          </div>

          {/* Before/after reveal */}
          {reveal && (
            <div style={{ backgroundColor: 'rgba(216,171,105,0.06)', border: `1px solid rgba(216,171,105,0.3)`, borderRadius: 10, padding: '20px 24px', margin: '0 auto 28px', maxWidth: 480, textAlign: 'left' }}>
              <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
                Before · After
              </p>
              <p style={{ color: S.text, fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>{reveal.heading}</p>
              <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{reveal.body}</p>
            </div>
          )}

          {/* Share / CTA */}
          <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.75, maxWidth: 440, margin: '0 auto 28px' }}>
            This result was generated by GroundedVote&apos;s bias-audited alignment quiz.
            No party labels — just issues that matter to you.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/align" style={{
              backgroundColor: S.gold, color: '#0F1B1F', padding: '13px 28px',
              borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}>
              Take the quiz yourself →
            </a>
            <a href="/races" style={{
              backgroundColor: 'rgba(255,255,255,0.05)', color: S.muted,
              padding: '13px 24px', borderRadius: 6, fontWeight: 600, fontSize: 14,
              textDecoration: 'none', border: `1px solid ${S.border}`,
            }}>
              Browse all races
            </a>
          </div>
        </div>
      </section>

      {/* All scores */}
      <section style={{ backgroundColor: S.bgDark, padding: 'clamp(32px, 5vh, 60px) 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{
            color: S.faint, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 20,
          }}>
            All Candidates · {race?.label}
          </p>
          {scores.map((s, i) => {
            const photo = getCandidatePhotoUrl(s.candidate)
            const score = Math.round(s.alignmentScore)
            const name  = `${s.candidate.firstName} ${s.candidate.lastName}`
            return (
              <div key={s.candidateId} style={{
                backgroundColor: i === 0 ? 'rgba(216,171,105,0.05)' : S.bgCard,
                border: `1.5px solid ${i === 0 ? 'rgba(216,171,105,0.3)' : S.border}`,
                borderRadius: 8, padding: '18px 22px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  {photo ? (
                    <img src={photo} alt={name}
                      style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: 'rgba(216,171,105,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ color: S.gold, fontWeight: 700, fontSize: 13 }}>
                        {s.candidate.firstName?.[0]}{s.candidate.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ color: S.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{name}</p>
                    {i === 0 && (
                      <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '2px 0 0' }}>
                        Closest Match
                      </p>
                    )}
                  </div>
                  <p style={{ color: MATCH_COLOR(score), fontSize: 26, fontWeight: 700, margin: 0 }}>{score}%</p>
                </div>
                <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ width: `${score}%`, height: '100%', borderRadius: 2, backgroundColor: MATCH_COLOR(score) }} />
                </div>
                <p style={{ color: S.faint, fontSize: 11, marginTop: 6 }}>
                  {MATCH_LABEL(score)} ·{' '}
                  {/* Pass sessionId so candidate profile can show personalized "On Your Issues" */}
                  <Link
                    href={`/candidates/${s.candidateId}?session=${params.sessionId}`}
                    style={{ color: S.gold, textDecoration: 'none' }}
                  >
                    See where they stand on your issues →
                  </Link>
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Ballot measure leanings */}
      {measureAnswers?.length > 0 && (
        <section style={{ backgroundColor: S.bgDark, padding: 'clamp(32px, 5vh, 60px) 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <p style={{ color: S.faint, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
              Your Ballot Measures
            </p>
            <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
              A leaning reflects your answer to one audited question per measure. Read the full text before you vote.
            </p>
            {measureAnswers.map(ma => {
              const lean = measureLeaning(ma.answerValue)
              return (
                <div key={ma.id} style={{ backgroundColor: S.bgCard, border: `1px solid ${S.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                    <p style={{ color: S.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{ma.measure.title}</p>
                    <p style={{ color: lean.color, fontSize: 13, fontWeight: 700, margin: 0 }}>{lean.label}</p>
                  </div>
                  {ma.measure.yesPosition && (
                    <p style={{ color: S.muted, fontSize: 12, lineHeight: 1.6, margin: '0 0 6px' }}>{ma.measure.yesPosition}</p>
                  )}
                  {ma.measure.sourceUrl && (
                    <a href={ma.measure.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: S.gold, fontSize: 12, textDecoration: 'none' }}>
                      Full text and analysis →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Methodology note */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(32px, 5vh, 56px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p style={{ color: S.faint, fontSize: 13, lineHeight: 1.75, marginBottom: 16 }}>
            Scores reflect weighted cosine similarity between your answers and AI-extracted candidate positions.
            All questions are bias-audited before reaching users.
          </p>
          <Link href="/methodology" style={{ color: S.gold, fontSize: 13, textDecoration: 'none' }}>
            Full methodology →
          </Link>
        </div>
      </section>
    </>
  )
}
