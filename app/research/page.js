// © 2025 The Founded Project LLC — All rights reserved.
// app/research/page.js
//
// Public research page: what GroundedVote publishes, under what privacy
// rules, and how partners get the data. Coverage stats come live from
// the database; participant aggregates appear only once a geography
// passes the reporting cohort.

import { platformCoverage, availableGeographies, currentPeriod, MIN_COHORT } from '@/lib/research'

export const revalidate = 3600

export const metadata = {
  title: 'Research Data | GroundedVote',
  description: 'Anonymized, aggregate civic research data from GroundedVote for academic and journalism partners. Minimum cohort 50. No individual data, ever.',
}

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

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ color: S.gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>{title}</h2>
      <div style={{ color: S.muted, fontSize: 15, lineHeight: 1.75 }}>{children}</div>
    </section>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ color: S.text, fontSize: 26, fontWeight: 700 }}>{value?.toLocaleString?.() ?? value}</div>
      <div style={{ color: S.muted, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

export default async function ResearchPage() {
  const period = currentPeriod()
  let coverage = null
  let geos = []
  try {
    ;[coverage, geos] = await Promise.all([platformCoverage(), availableGeographies(period)])
  } catch { /* DB unavailable at build time */ }

  return (
    <div style={{ backgroundColor: S.bg, minHeight: '100vh', padding: 'clamp(48px, 8vh, 96px) 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>
          Research
        </p>
        <h1 style={{ color: S.text, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 14 }}>
          Civic research data, built on consent.
        </h1>
        <p style={{ color: S.muted, fontSize: 16, lineHeight: 1.75, marginBottom: 48 }}>
          GroundedVote publishes anonymized, aggregate data about how voters&apos; stated preferences compare with their measured alignment. Researchers and journalists can use it freely with attribution.
        </p>

        {coverage && (
          <section style={{ marginBottom: 48, padding: '20px 24px', borderRadius: 10, backgroundColor: S.bgCard, border: `1px solid ${S.border}`, display: 'flex', gap: 36, flexWrap: 'wrap' }}>
            <Stat value={coverage.races} label="Races covered" />
            <Stat value={coverage.candidates} label="Candidates" />
            <Stat value={coverage.approvedQuestions} label="Bias-audited questions" />
            <Stat value={coverage.scoredPositions} label="Scored positions" />
          </section>
        )}

        <Section title="What we publish">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 10 }}><strong style={{ color: S.text }}>Before/after gap rates</strong> — of voters who named a pick before the quiz, the share whose answers aligned with someone else.</li>
            <li style={{ marginBottom: 10 }}><strong style={{ color: S.text }}>Issue salience by geography</strong> — which issues voters in each state weight most.</li>
            <li style={{ marginBottom: 10 }}><strong style={{ color: S.text }}>Alignment strength</strong> — mean top-match scores by geography and period.</li>
          </ul>
        </Section>

        <Section title="Privacy rules, enforced in code">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginBottom: 10 }}>Data comes only from account holders who checked the research opt-in at signup. The default is out.</li>
            <li style={{ marginBottom: 10 }}>Any cohort under {MIN_COHORT} is withheld entirely.</li>
            <li style={{ marginBottom: 10 }}>Geography stops at the state level. Names, emails, and addresses never enter the pipeline.</li>
            <li style={{ marginBottom: 10 }}>Only sums and rates leave the database — individual rows have no export path.</li>
          </ul>
        </Section>

        <Section title={`Available datasets — ${period}`}>
          {geos.length > 0 ? (
            <p>Geographies past the reporting cohort this period: <strong style={{ color: S.text }}>{geos.join(', ')}</strong>. National aggregates publish once the combined cohort passes {MIN_COHORT}.</p>
          ) : (
            <p>No geography has reached the minimum reporting cohort of {MIN_COHORT} opted-in participants this period. Datasets appear here automatically as participation grows — the platform launched for the 2026 cycle and this page tells the truth about sample sizes.</p>
          )}
        </Section>

        <Section title="For partners: the API">
          <p style={{ marginBottom: 12 }}>Aggregates are available as JSON or CSV, no key required:</p>
          <pre style={{ backgroundColor: S.bgDark, border: `1px solid ${S.border}`, borderRadius: 8, padding: '14px 18px', overflowX: 'auto', color: S.teal, fontSize: 13, lineHeight: 1.7 }}>
{`GET /api/research/aggregate?geography=MN&period=${period}
GET /api/research/aggregate?geography=US&period=${period}&format=csv`}
          </pre>
          <p style={{ marginTop: 12 }}>Suppressed cohorts return <code style={{ color: S.teal }}>{'{ "suppressed": true }'}</code> with no counts. Weekly snapshots preserve each period for longitudinal work.</p>
        </Section>

        <Section title="Work with us">
          <p>
            Academic partnerships, methodology questions, and press inquiries:{' '}
            <a href="mailto:contact@groundedvote.com" style={{ color: S.gold, textDecoration: 'none' }}>contact@groundedvote.com</a>.
            The full methodology white paper is available for review on request, and the question audit trail is public at{' '}
            <a href="/audit-trail" style={{ color: S.gold, textDecoration: 'none' }}>/audit-trail</a>.
          </p>
        </Section>
      </div>
    </div>
  )
}
