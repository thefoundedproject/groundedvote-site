import { prisma } from '@/lib/prisma'
import RaceList from './RaceList'

export const metadata = {
  title: '2026 Competitive Races | GroundedVote',
  description: 'Browse all competitive Senate and House races covered by GroundedVote for 2026. Filter by chamber, status, or state. Find your race and take the alignment quiz.',
}

export const revalidate = 300

const S = {
  bg: '#0F1B1F', bgDark: '#060f11', gold: '#D8AB69', teal: '#5ECFA6',
  text: '#F5F0E8', muted: 'rgba(245,240,232,0.5)',
}

async function getRaces() {
  return prisma.race.findMany({
    where: { year: 2026 },
    include: {
      candidates: { select: { id: true, firstName: true, lastName: true, party: true } },
      _count: { select: { questions: { where: { auditStatus: 'APPROVED' } } } },
    },
    orderBy: [{ chamber: 'asc' }, { state: 'asc' }],
  })
}

export default async function RacesPage() {
  const races = await getRaces()
  const totalReady = races.filter(r => r._count.questions >= 5 && r.candidates.length >= 2).length
  const senateCount = races.filter(r => r.chamber === 'SENATE').length
  const houseCount = races.filter(r => r.chamber === 'HOUSE').length

  return (
    <>
      {/* Hero */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(48px, 8vh, 96px) 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>
            2026 Election Coverage
          </p>
          <h1 style={{ color: S.text, fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 16 }}>
            Competitive races we cover
          </h1>
          <p style={{ color: S.muted, fontSize: 16, lineHeight: 1.75, maxWidth: 560, marginBottom: 32 }}>
            {races.length} competitive federal races — {senateCount} Senate seats and {houseCount} House districts. {totalReady} quiz-ready today.
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { n: races.length, label: 'Races tracked' },
              { n: Object.keys(races.reduce((a, r) => ({ ...a, [r.state]: 1 }), {})).length, label: 'States covered' },
              { n: totalReady, label: 'Quiz ready now' },
            ].map(({ n, label }) => (
              <div key={label}>
                <p style={{ color: S.gold, fontSize: 32, fontWeight: 700, margin: '0 0 2px', lineHeight: 1 }}>{n}</p>
                <p style={{ color: S.muted, fontSize: 12, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filterable list — client component */}
      <RaceList races={races} />
    </>
  )
}
