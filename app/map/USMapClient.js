'use client'
import { useState, useEffect } from 'react'

const S = {
  bg: '#0F1B1F',
  bgDark: '#060f11',
  bgCard: 'rgba(255,255,255,0.03)',
  gold: '#D8AB69',
  teal: '#5ECFA6',
  text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)',
  faint: 'rgba(245,240,232,0.25)',
  border: 'rgba(216,171,105,0.15)',
}

// Geographic cartogram grid — each state positioned by (col, row)
const ALL_STATES = [
  // Row 0
  { code: 'ME', name: 'Maine',          col: 10, row: 0 },
  // Row 1
  { code: 'VT', name: 'Vermont',        col: 8,  row: 1 },
  { code: 'NH', name: 'New Hampshire',  col: 9,  row: 1 },
  // Row 2
  { code: 'WA', name: 'Washington',     col: 0,  row: 2 },
  { code: 'MT', name: 'Montana',        col: 1,  row: 2 },
  { code: 'ND', name: 'North Dakota',   col: 2,  row: 2 },
  { code: 'MN', name: 'Minnesota',      col: 3,  row: 2 },
  { code: 'WI', name: 'Wisconsin',      col: 5,  row: 2 },
  { code: 'MI', name: 'Michigan',       col: 7,  row: 2 },
  { code: 'NY', name: 'New York',       col: 8,  row: 2 },
  { code: 'MA', name: 'Massachusetts',  col: 9,  row: 2 },
  { code: 'RI', name: 'Rhode Island',   col: 10, row: 2 },
  // Row 3
  { code: 'OR', name: 'Oregon',         col: 0,  row: 3 },
  { code: 'ID', name: 'Idaho',          col: 1,  row: 3 },
  { code: 'SD', name: 'South Dakota',   col: 2,  row: 3 },
  { code: 'IA', name: 'Iowa',           col: 3,  row: 3 },
  { code: 'NE', name: 'Nebraska',       col: 4,  row: 3 },
  { code: 'IL', name: 'Illinois',       col: 5,  row: 3 },
  { code: 'IN', name: 'Indiana',        col: 6,  row: 3 },
  { code: 'OH', name: 'Ohio',           col: 7,  row: 3 },
  { code: 'PA', name: 'Pennsylvania',   col: 8,  row: 3 },
  { code: 'NJ', name: 'New Jersey',     col: 9,  row: 3 },
  { code: 'CT', name: 'Connecticut',    col: 10, row: 3 },
  // Row 4
  { code: 'CA', name: 'California',     col: 0,  row: 4 },
  { code: 'NV', name: 'Nevada',         col: 1,  row: 4 },
  { code: 'WY', name: 'Wyoming',        col: 2,  row: 4 },
  { code: 'CO', name: 'Colorado',       col: 3,  row: 4 },
  { code: 'KS', name: 'Kansas',         col: 4,  row: 4 },
  { code: 'MO', name: 'Missouri',       col: 5,  row: 4 },
  { code: 'KY', name: 'Kentucky',       col: 6,  row: 4 },
  { code: 'WV', name: 'West Virginia',  col: 7,  row: 4 },
  { code: 'VA', name: 'Virginia',       col: 8,  row: 4 },
  { code: 'MD', name: 'Maryland',       col: 9,  row: 4 },
  { code: 'DE', name: 'Delaware',       col: 10, row: 4 },
  // Row 5
  { code: 'UT', name: 'Utah',           col: 1,  row: 5 },
  { code: 'NM', name: 'New Mexico',     col: 3,  row: 5 },
  { code: 'OK', name: 'Oklahoma',       col: 4,  row: 5 },
  { code: 'AR', name: 'Arkansas',       col: 5,  row: 5 },
  { code: 'TN', name: 'Tennessee',      col: 6,  row: 5 },
  { code: 'NC', name: 'North Carolina', col: 7,  row: 5 },
  { code: 'SC', name: 'South Carolina', col: 8,  row: 5 },
  { code: 'DC', name: 'Washington DC',  col: 9,  row: 5 },
  // Row 6
  { code: 'AZ', name: 'Arizona',        col: 0,  row: 6 },
  { code: 'TX', name: 'Texas',          col: 2,  row: 6 },
  { code: 'LA', name: 'Louisiana',      col: 4,  row: 6 },
  { code: 'MS', name: 'Mississippi',    col: 5,  row: 6 },
  { code: 'AL', name: 'Alabama',        col: 6,  row: 6 },
  { code: 'GA', name: 'Georgia',        col: 7,  row: 6 },
  // Row 7
  { code: 'FL', name: 'Florida',        col: 7,  row: 7 },
  // Row 8
  { code: 'HI', name: 'Hawaii',         col: 0,  row: 8 },
  { code: 'AK', name: 'Alaska',         col: 1,  row: 8 },
]

const CELL = 52  // px per cell
const GAP = 4    // px gap between cells

function StateCell({ state, hasRaces, isReady, isSelected, onClick }) {
  const [hovered, setHovered] = useState(false)

  let bg, border, textColor
  if (isSelected) {
    bg = S.gold
    border = S.gold
    textColor = '#0F1B1F'
  } else if (isReady) {
    bg = hovered ? 'rgba(94,207,166,0.25)' : 'rgba(94,207,166,0.12)'
    border = 'rgba(94,207,166,0.5)'
    textColor = '#5ECFA6'
  } else if (hasRaces) {
    bg = hovered ? 'rgba(216,171,105,0.2)' : 'rgba(216,171,105,0.1)'
    border = 'rgba(216,171,105,0.4)'
    textColor = '#D8AB69'
  } else {
    bg = hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'
    border = 'rgba(255,255,255,0.08)'
    textColor = 'rgba(245,240,232,0.25)'
  }

  return (
    <div
      onClick={hasRaces ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={state.name}
      style={{
        gridColumn: state.col + 1,
        gridRow: state.row + 1,
        backgroundColor: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: hasRaces ? 'pointer' : 'default',
        transition: 'all 0.15s',
        userSelect: 'none',
        aspectRatio: '1',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: textColor, letterSpacing: '0.05em' }}>
        {state.code}
      </span>
    </div>
  )
}

function StatusBadge({ race }) {
  if (race.isReady) {
    return (
      <span style={{ backgroundColor: 'rgba(94,207,166,0.15)', color: '#5ECFA6', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', flexShrink: 0 }}>
        Quiz Ready
      </span>
    )
  }
  if (race.candidates.length >= 2) {
    return (
      <span style={{ backgroundColor: 'rgba(216,171,105,0.12)', color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', flexShrink: 0 }}>
        Building
      </span>
    )
  }
  return (
    <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(245,240,232,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', flexShrink: 0 }}>
      Seeding
    </span>
  )
}

export default function USMapClient() {
  const [byState, setByState] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState(null)

  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    const url = isLocal ? 'https://groundedvote.com/api/races' : '/api/races'
    fetch(url)
      .then(r => r.json())
      .then(({ races = [] }) => {
        const grouped = {}
        for (const race of races) {
          if (!grouped[race.state]) {
            grouped[race.state] = { stateFull: race.stateFull ?? race.state, races: [] }
          }
          const approvedQuestions = race._count?.questions ?? 0
          grouped[race.state].races.push({
            id: race.id,
            label: race.label,
            chamber: race.chamber,
            district: race.district,
            candidates: race.candidates ?? [],
            approvedQuestions,
            isReady: approvedQuestions >= 5 && (race.candidates?.length ?? 0) >= 2,
          })
        }
        setByState(grouped)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const stats = {
    stateCount: Object.keys(byState).length,
    totalRaces: Object.values(byState).reduce((n, s) => n + s.races.length, 0),
    readyCount: Object.values(byState).flatMap(s => s.races).filter(r => r.isReady).length,
  }

  const selectedData = selectedState ? byState[selectedState] : null
  const totalCols = 11
  const totalRows = 9

  return (
    <>
      {/* Hero */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(40px, 6vh, 72px) 24px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>
            2026 Midterm Coverage
          </p>
          <h1 style={{ color: S.text, fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 12 }}>
            Race map
          </h1>
          <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, maxWidth: 540, marginBottom: 28 }}>
            Select a state to see which Senate and House races are active this cycle. Highlighted states have race data. Green means quiz-ready.
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 8 }}>
            {[
              { n: stats.stateCount, label: 'States covered' },
              { n: stats.totalRaces, label: 'Races tracked' },
              { n: stats.readyCount, label: 'Quiz ready now' },
            ].map(({ n, label }) => (
              <div key={label}>
                <p style={{ color: S.gold, fontSize: 28, fontWeight: 700, margin: '0 0 2px', lineHeight: 1 }}>{n}</p>
                <p style={{ color: S.muted, fontSize: 11, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legend */}
      <div style={{ backgroundColor: S.bgDark, borderTop: `1px solid ${S.border}`, borderBottom: `1px solid ${S.border}`, padding: '10px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: S.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Legend:</span>
          {[
            { bg: 'rgba(94,207,166,0.12)', border: 'rgba(94,207,166,0.5)', color: '#5ECFA6', label: 'Quiz ready' },
            { bg: 'rgba(216,171,105,0.1)', border: 'rgba(216,171,105,0.4)', color: '#D8AB69', label: 'Building' },
            { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', color: 'rgba(245,240,232,0.25)', label: 'No coverage' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 22, height: 22, backgroundColor: item.bg, border: `1.5px solid ${item.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: item.color }}>ST</span>
              </div>
              <span style={{ color: S.muted, fontSize: 12 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <section style={{ backgroundColor: S.bgDark, padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', overflowX: 'auto' }}>
          {loading && (
            <p style={{ color: S.muted, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              Loading race data...
            </p>
          )}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${totalCols}, ${CELL}px)`,
            gridTemplateRows: `repeat(${totalRows}, ${CELL}px)`,
            gap: GAP,
            minWidth: totalCols * (CELL + GAP),
          }}>
            {ALL_STATES.map(state => {
              const stateData = byState[state.code]
              const hasRaces = !!stateData
              const isReady = hasRaces && stateData.races.some(r => r.isReady)
              return (
                <StateCell
                  key={state.code}
                  state={state}
                  hasRaces={hasRaces}
                  isReady={isReady}
                  isSelected={selectedState === state.code}
                  onClick={() => setSelectedState(prev => prev === state.code ? null : state.code)}
                />
              )
            })}
          </div>
          <p style={{ color: S.faint, fontSize: 11, marginTop: 16, textAlign: 'center' }}>
            Click a highlighted state to view its races below.
          </p>
        </div>
      </section>

      {/* Race detail panel */}
      {selectedData ? (
        <section style={{ backgroundColor: S.bg, padding: 'clamp(24px, 4vh, 48px) 24px', borderTop: `1px solid ${S.border}` }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ color: S.teal, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                  {selectedState}
                </p>
                <h2 style={{ color: S.text, fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 300, margin: 0 }}>
                  {selectedData.stateFull}
                </h2>
              </div>
              <button
                onClick={() => setSelectedState(null)}
                style={{ background: 'none', border: `1px solid ${S.border}`, color: S.muted, borderRadius: 5, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedData.races.map(race => (
                <div
                  key={race.id}
                  style={{
                    backgroundColor: S.bgCard,
                    border: `1px solid ${race.isReady ? 'rgba(94,207,166,0.2)' : S.border}`,
                    borderRadius: 8,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: S.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{race.label}</p>
                      <p style={{ color: S.muted, fontSize: 12, margin: '0 0 8px' }}>
                        {race.chamber === 'SENATE' ? 'U.S. Senate' : 'U.S. House'}
                        {race.district ? ` · District ${race.district}` : ''}
                        {' · '}{race.approvedQuestions} approved questions
                        {' · '}{race.candidates.length} candidate{race.candidates.length !== 1 ? 's' : ''}
                      </p>
                      {race.candidates.length > 0 && (
                        <p style={{ color: S.faint, fontSize: 11, margin: 0 }}>
                          {race.candidates.map((c, i) => (
                            <span key={c.id}>
                              {i > 0 && ' vs. '}
                              <span style={{ color: c.incumbent ? S.teal : S.faint }}>
                                {c.firstName} {c.lastName}{c.incumbent ? ' ★' : ''}
                              </span>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <StatusBadge race={race} />
                      {race.isReady && (
                        <a
                          href="/align"
                          style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '7px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Take quiz →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Voting info box */}
            <div style={{ backgroundColor: 'rgba(94,207,166,0.06)', border: '1px solid rgba(94,207,166,0.2)', borderRadius: 8, padding: '16px 20px', marginTop: 24 }}>
              <p style={{ color: '#5ECFA6', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Voting in {selectedData.stateFull}
              </p>
              <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.65, margin: '0 0 10px' }}>
                General Election: <strong style={{ color: S.text }}>November 3, 2026</strong>
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a
                  href={`https://vote.gov`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#5ECFA6', fontSize: 12, fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(94,207,166,0.4)' }}
                >
                  Check registration at vote.gov →
                </a>
                <a
                  href={`https://www.vote411.org/ballot`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: S.gold, fontSize: 12, fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(216,171,105,0.4)' }}
                >
                  View your full ballot at Vote411 →
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* All races list when no state selected */
        <section style={{ backgroundColor: S.bg, padding: 'clamp(24px, 4vh, 48px) 24px', borderTop: `1px solid ${S.border}` }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <p style={{ color: S.muted, fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
              Select a state above — or browse all covered races below.
            </p>
            {Object.entries(byState)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([code, { stateFull, races }]) => (
                <div key={code} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <p style={{ color: S.teal, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                      {stateFull}
                    </p>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(94,207,166,0.12)' }} />
                  </div>
                  {races.map(race => (
                    <div
                      key={race.id}
                      style={{
                        backgroundColor: S.bgCard,
                        border: `1px solid ${race.isReady ? 'rgba(94,207,166,0.2)' : S.border}`,
                        borderRadius: 7,
                        padding: '13px 18px',
                        marginBottom: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <p style={{ color: S.text, fontSize: 14, fontWeight: 600, margin: '0 0 3px' }}>{race.label}</p>
                        <p style={{ color: S.muted, fontSize: 11, margin: 0 }}>
                          {race.approvedQuestions} questions · {race.candidates.length} candidates
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge race={race} />
                        {race.isReady && (
                          <a href="/align" style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '6px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                            Take quiz →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ backgroundColor: S.bgDark, padding: 'clamp(32px, 5vh, 64px) 24px', textAlign: 'center', borderTop: `1px solid ${S.border}` }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.75, marginBottom: 20 }}>
            Don't see your state yet? Coverage expands through the 2026 cycle.
          </p>
          <a
            href="/#notify"
            style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '12px 28px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', display: 'inline-block' }}
          >
            Notify me when my state is added →
          </a>
        </div>
      </section>
    </>
  )
}
