import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 300

const ACTIVE_STATES = ['AZ','CA','CO','GA','IA','ME','MI','MN','MT','NC','NH','NM','NV','NY','OH','OR','PA','TX','VA','WA','WI']

export async function generateStaticParams() {
  const races = await prisma.race.findMany({ select: { state: true }, distinct: ['state'] })
  return races.map(r => ({ code: r.state.toLowerCase() }))
}

export async function generateMetadata({ params }) {
  const code = params.code.toUpperCase()
  const race = await prisma.race.findFirst({ where: { state: code, year: 2026 }, select: { stateFull: true } })
  const name = race?.stateFull ?? code
  return {
    title: `${name} 2026 Voter Guide | GroundedVote`,
    description: `Nonpartisan voter alignment quiz for ${name}'s 2026 competitive federal races. Find which candidates match your actual policy positions — no party labels.`,
    openGraph: {
      title: `${name} 2026 Voter Guide | GroundedVote`,
      description: `Bias-audited alignment quiz for ${name} Senate and House races. No party labels — just issues.`,
      url: `https://groundedvote.com/states/${params.code}`,
    },
  }
}

async function getStateData(code) {
  const races = await prisma.race.findMany({
    where: { state: code, year: 2026 },
    include: {
      candidates: { select: { id: true, firstName: true, lastName: true, party: true, isIncumbent: true, photoUrl: true, bioguideId: true } },
      _count: { select: { questions: { where: { auditStatus: 'APPROVED' } } } },
    },
    orderBy: { chamber: 'asc' },
  })
  return races
}

const S = {
  bg: '#0F1B1F', bgDark: '#060f11', bgCard: 'rgba(255,255,255,0.03)',
  gold: '#D8AB69', teal: '#5ECFA6', text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)', faint: 'rgba(245,240,232,0.25)',
  border: 'rgba(216,171,105,0.15)',
}

function StatusBadge({ qCount, candidateCount }) {
  if (qCount >= 5 && candidateCount >= 2)
    return <span style={{ backgroundColor: 'rgba(94,207,166,0.15)', color: '#5ECFA6', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 4, textTransform: 'uppercase' }}>Quiz Ready</span>
  if (candidateCount >= 2)
    return <span style={{ backgroundColor: 'rgba(216,171,105,0.12)', color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 4, textTransform: 'uppercase' }}>Building</span>
  return <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(245,240,232,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 4, textTransform: 'uppercase' }}>Seeding</span>
}

export default async function StatePage({ params }) {
  const code = params.code.toUpperCase()
  const races = await getStateData(code)
  if (!races.length) notFound()

  const stateFull = races[0].stateFull ?? code
  const isActive = ACTIVE_STATES.includes(code)
  const totalReady = races.filter(r => r._count.questions >= 5 && r.candidates.length >= 2).length
  const senateRaces = races.filter(r => r.chamber === 'SENATE')
  const houseRaces = races.filter(r => r.chamber === 'HOUSE')

  return (
    <>
      {/* Hero */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(48px, 8vh, 96px) 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Link href="/races" style={{ color: S.muted, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            ← All races
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0 }}>2026 Voter Guide</p>
            {isActive && <span style={{ backgroundColor: 'rgba(94,207,166,0.15)', color: '#5ECFA6', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 4, textTransform: 'uppercase' }}>Live</span>}
          </div>
          <h1 style={{ color: S.text, fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 16 }}>
            {stateFull}
          </h1>
          <p style={{ color: S.muted, fontSize: 16, lineHeight: 1.75, maxWidth: 540, marginBottom: 32 }}>
            GroundedVote covers {races.length} competitive federal {races.length === 1 ? 'race' : 'races'} in {stateFull} for 2026.
            {totalReady > 0 ? ` ${totalReady} ${totalReady === 1 ? 'is' : 'are'} quiz-ready today.` : ' Questions are being generated now.'}
            {' '}No party labels — find candidates who match what you actually believe.
          </p>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 36 }}>
            {[
              { n: races.length, label: 'Races covered' },
              { n: races.reduce((s, r) => s + r.candidates.length, 0), label: 'Candidates' },
              { n: totalReady, label: 'Quiz ready' },
            ].map(({ n, label }) => (
              <div key={label}>
                <p style={{ color: S.gold, fontSize: 32, fontWeight: 700, margin: '0 0 2px', lineHeight: 1 }}>{n}</p>
                <p style={{ color: S.muted, fontSize: 12, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          <a href="/align" style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '14px 32px', borderRadius: 6, fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-block' }}>
            Find my {stateFull} match →
          </a>
        </div>
      </section>

      {/* Races */}
      {[{ label: 'U.S. Senate', races: senateRaces }, { label: 'U.S. House', races: houseRaces }]
        .filter(g => g.races.length > 0)
        .map(group => (
          <section key={group.label} style={{ backgroundColor: S.bgDark, padding: 'clamp(28px, 5vh, 56px) 24px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <p style={{ color: S.teal, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>{group.label}</p>
                <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(94,207,166,0.15)' }} />
              </div>
              {group.races.map(race => {
                const isReady = race._count.questions >= 5 && race.candidates.length >= 2
                return (
                  <div key={race.id} style={{ backgroundColor: S.bgCard, border: `1px solid ${isReady ? 'rgba(94,207,166,0.2)' : S.border}`, borderRadius: 10, padding: '22px 24px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <p style={{ color: S.text, fontSize: 17, fontWeight: 600, margin: 0 }}>{race.label}</p>
                          <StatusBadge qCount={race._count.questions} candidateCount={race.candidates.length} />
                        </div>
                        <p style={{ color: S.muted, fontSize: 12, margin: '0 0 12px' }}>
                          {race._count.questions} approved questions · {race.candidates.length} candidates
                        </p>
                        {/* Candidate chips */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {race.candidates.map(c => (
                            <Link
                              key={c.id}
                              href={`/candidates/${c.id}`}
                              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${S.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 12, color: S.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              {c.isIncumbent && <span style={{ color: S.teal, fontSize: 9, fontWeight: 700 }}>★</span>}
                              {c.firstName} {c.lastName}
                            </Link>
                          ))}
                        </div>
                      </div>
                      {isReady && (
                        <a href="/align" style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '10px 20px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          Take quiz →
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}

      {/* SEO / explainer */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(40px, 6vh, 72px) 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ color: S.text, fontSize: 22, fontWeight: 300, marginBottom: 16 }}>
            How the {stateFull} voter guide works
          </h2>
          <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.85, marginBottom: 16 }}>
            GroundedVote generates policy questions for each competitive race using a 3-pass AI bias audit — Claude Opus drafts, GPT-4o scores, Claude Sonnet selects. Candidate positions are extracted from voting records, public statements, and campaign platforms, then matched against your answers using weighted cosine similarity.
          </p>
          <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.85, marginBottom: 24 }}>
            Results show alignment scores without party labels. You see the percentage match first, and can explore the evidence behind each position.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/methodology" style={{ color: S.gold, fontSize: 14, textDecoration: 'none' }}>Full methodology →</Link>
            <Link href="/audit" style={{ color: S.gold, fontSize: 14, textDecoration: 'none' }}>Public audit trail →</Link>
          </div>
        </div>
      </section>

      {/* Waitlist if not active */}
      {!isActive && (
        <section style={{ backgroundColor: S.bgDark, padding: 'clamp(40px, 6vh, 72px) 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.75, marginBottom: 24 }}>
              {stateFull} race data is still being prepared. Get notified when it goes live.
            </p>
            <a href={`/?state=${code}`} style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '13px 28px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Notify me when {stateFull} is live →
            </a>
          </div>
        </section>
      )}
    </>
  )
}
