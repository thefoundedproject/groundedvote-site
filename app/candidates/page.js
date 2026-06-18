// © 2025 The Founded Project LLC — All rights reserved.
// app/candidates/page.js

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getCandidatePhotoUrl, getCandidateInitials } from '@/lib/candidate-photo'

export const revalidate = 300
export const metadata = {
  title: 'Candidates | GroundedVote',
  description: 'Browse all 2026 candidates tracked by GroundedVote — with AI-extracted policy positions and bias-audited quiz alignment.',
}

const PARTY_COLORS = { D: '#4A90D9', R: '#D9534A', I: '#9B7BD9', G: '#5ECF8A', L: '#D9AB4A' }
const PARTY_LABELS = { D: 'Democrat', R: 'Republican', I: 'Independent', G: 'Green', L: 'Libertarian' }
const S = {
  bg: '#0F1B1F', bgCard: 'rgba(255,255,255,0.03)',
  gold: '#D8AB69', teal: '#5ECFA6', text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)', faint: 'rgba(245,240,232,0.12)',
  border: 'rgba(216,171,105,0.15)',
}

async function getAllCandidates() {
  const candidates = await prisma.candidate.findMany({
    include: {
      race: { select: { id: true, label: true, state: true, stateFull: true, chamber: true, year: true } },
      _count: { select: { answers: true } },
    },
    orderBy: [{ race: { state: 'asc' } }, { party: 'asc' }, { lastName: 'asc' }],
  })
  // Group by race
  const byRace = {}
  for (const c of candidates) {
    const key = c.raceId
    if (!byRace[key]) byRace[key] = { race: c.race, candidates: [] }
    byRace[key].candidates.push(c)
  }
  return Object.values(byRace).sort((a, b) =>
    (a.race?.state ?? '').localeCompare(b.race?.state ?? '')
  )
}

function CandidateCard({ c }) {
  const partyColor = PARTY_COLORS[c.party] ?? S.muted
  const photoUrl   = getCandidatePhotoUrl(c)
  const positionCount = c._count?.answers ?? 0

  return (
    <Link href={`/candidates/${c.id}`}
      style={{ display: 'block', textDecoration: 'none',
        backgroundColor: S.bgCard, border: `1px solid ${S.faint}`,
        borderRadius: 12, padding: '16px 18px', transition: 'border-color 0.2s',
        borderLeft: `3px solid ${partyColor}` }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar */}
        {photoUrl ? (
          <img src={photoUrl} alt={`${c.firstName} ${c.lastName}`}
            style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover',
              flexShrink: 0, border: `1px solid ${partyColor}55` }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            backgroundColor: `${partyColor}18`, border: `1px solid ${partyColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: partyColor, fontWeight: 700, fontSize: 16 }}>
              {getCandidateInitials(c)}
            </span>
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ color: S.text, fontWeight: 600, fontSize: 15 }}>
              {c.firstName} {c.lastName}
            </span>
            {c.incumbent && (
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
                padding: '2px 6px', borderRadius: 10, backgroundColor: `${S.teal}18`,
                border: `1px solid ${S.teal}44`, color: S.teal }}>
                INCUMBENT
              </span>
            )}
          </div>
          <div style={{ color: partyColor, fontSize: 12, fontWeight: 600 }}>
            {PARTY_LABELS[c.party] ?? c.party}
          </div>
        </div>

        {/* Position count */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {positionCount > 0 ? (
            <>
              <div style={{ color: S.teal, fontSize: 18, fontWeight: 700 }}>{positionCount}</div>
              <div style={{ color: S.muted, fontSize: 10, letterSpacing: '0.05em' }}>POSITIONS</div>
            </>
          ) : (
            <div style={{ color: S.faint, fontSize: 11 }}>No data yet</div>
          )}
          <div style={{ color: S.gold, fontSize: 11, marginTop: 4 }}>View Profile →</div>
        </div>
      </div>
    </Link>
  )
}

export default async function CandidatesPage() {
  const raceGroups = await getAllCandidates()
  const totalCandidates = raceGroups.reduce((s, g) => s + g.candidates.length, 0)
  const totalRaces = raceGroups.length

  return (
    <main style={{ backgroundColor: S.bg, minHeight: '100vh', color: S.text }}>

      {/* ── PAGE HEADER ── */}
      <section style={{ borderBottom: `1px solid ${S.border}`,
        padding: 'clamp(40px,7vh,80px) clamp(20px,5vw,64px) clamp(28px,4vh,48px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', margin: '0 0 12px' }}>
            GroundedVote &middot; 2026
          </p>
          <h1 style={{ color: S.text, fontSize: 'clamp(30px,5vw,52px)', fontWeight: 300,
            margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Candidate <strong style={{ fontWeight: 700 }}>Profiles</strong>
          </h1>
          <p style={{ color: S.muted, fontSize: 16, margin: '0 0 24px', maxWidth: 560 }}>
            {totalCandidates} candidates across {totalRaces} races.
            Every profile includes AI-extracted policy positions and bias-audited alignment data.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/races" style={{ color: S.gold, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', border: `1px solid ${S.border}`, padding: '8px 16px', borderRadius: 20 }}>
              ← Browse Races
            </Link>
            <Link href="/align" style={{ backgroundColor: S.gold, color: '#0F1B1F', fontSize: 13,
              fontWeight: 700, textDecoration: 'none', padding: '8px 16px', borderRadius: 20 }}>
              Take the Quiz
            </Link>
          </div>
        </div>
      </section>

      {/* ── RACE GROUPS ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(32px,5vw,64px) clamp(20px,5vw,64px)' }}>
        {raceGroups.map(({ race, candidates }) => (
          <div key={race?.id ?? Math.random()} style={{ marginBottom: 48 }}>

            {/* Race header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
              paddingBottom: 12, borderBottom: `1px solid ${S.border}` }}>
              <div style={{ width: 3, height: 28, backgroundColor: S.gold, borderRadius: 2, flexShrink: 0 }} />
              <div>
                <h2 style={{ color: S.text, fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                  {race?.label ?? 'Unknown Race'}
                </h2>
                <p style={{ color: S.muted, fontSize: 12, margin: '2px 0 0' }}>
                  {race?.chamber === 'SENATE' ? 'U.S. Senate' : 'U.S. House'} &middot; {race?.stateFull}
                </p>
              </div>
              <Link href={`/races/${race?.id ?? ''}`}
                style={{ marginLeft: 'auto', color: S.gold, fontSize: 12, textDecoration: 'none',
                  border: `1px solid ${S.border}`, padding: '5px 12px', borderRadius: 16 }}>
                Race Page →
              </Link>
            </div>

            {/* Candidate cards grid */}
            <div style={{ display: 'grid', gap: 12,
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {candidates.map(c => <CandidateCard key={c.id} c={c} />)}
            </div>
          </div>
        ))}

        {raceGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <p style={{ color: S.muted, fontSize: 15 }}>No candidates found.</p>
          </div>
        )}

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${S.faint}`,
          color: S.muted, fontSize: 12 }}>
          All positions AI-extracted and bias-audited. &copy; 2025 The Founded Project LLC.
        </div>
      </div>
    </main>
  )
}
