'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

const S = {
  bg: '#0F1B1F', bgDark: '#060f11', bgCard: 'rgba(255,255,255,0.03)',
  gold: '#D8AB69', teal: '#5ECFA6', text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)', faint: 'rgba(245,240,232,0.25)',
  border: 'rgba(216,171,105,0.15)', input: 'rgba(255,255,255,0.06)',
}

function StatusBadge({ qCount, candidateCount }) {
  if (qCount >= 5 && candidateCount >= 2)
    return <span style={{ backgroundColor: 'rgba(94,207,166,0.15)', color: '#5ECFA6', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 4, textTransform: 'uppercase' }}>Quiz Ready</span>
  if (candidateCount >= 2)
    return <span style={{ backgroundColor: 'rgba(216,171,105,0.12)', color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 4, textTransform: 'uppercase' }}>Building</span>
  return <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(245,240,232,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 4, textTransform: 'uppercase' }}>Seeding</span>
}

export default function RaceList({ races }) {
  const [search, setSearch] = useState('')
  const [chamber, setChamber] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return races.filter(r => {
      const matchSearch = !q || r.label.toLowerCase().includes(q) || r.state.toLowerCase().includes(q) || (r.stateFull ?? '').toLowerCase().includes(q)
      const matchChamber = chamber === 'all' || r.chamber === chamber
      const ready = r._count.questions >= 5 && r.candidates.length >= 2
      const building = !ready && r.candidates.length >= 2
      const matchStatus = statusFilter === 'all' || (statusFilter === 'ready' && ready) || (statusFilter === 'building' && building) || (statusFilter === 'seeding' && !ready && !building)
      return matchSearch && matchChamber && matchStatus
    })
  }, [races, search, chamber, statusFilter])

  const byState = filtered.reduce((acc, r) => {
    if (!acc[r.state]) acc[r.state] = { stateFull: r.stateFull ?? r.state, races: [] }
    acc[r.state].races.push(r)
    return acc
  }, {})

  const chipStyle = (active) => ({
    backgroundColor: active ? S.gold : S.input,
    color: active ? '#0F1B1F' : S.muted,
    border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
  })

  return (
    <>
      {/* Filter bar */}
      <div style={{ backgroundColor: S.bgDark, padding: '20px 24px', borderBottom: '1px solid rgba(216,171,105,0.08)', position: 'sticky', top: 64, zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search races or states…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180, backgroundColor: S.input, border: '1px solid rgba(216,171,105,0.2)', borderRadius: 8, padding: '9px 14px', color: S.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
          {['all', 'SENATE', 'HOUSE'].map(c => (
            <button key={c} onClick={() => setChamber(c)} style={chipStyle(chamber === c)}>
              {c === 'all' ? 'All Chambers' : c === 'SENATE' ? 'Senate' : 'House'}
            </button>
          ))}
          {['all', 'ready', 'building', 'seeding'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={chipStyle(statusFilter === s)}>
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Race list */}
      <section style={{ backgroundColor: S.bgDark, padding: 'clamp(24px, 4vh, 48px) 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {filtered.length === 0 ? (
            <p style={{ color: S.muted, fontSize: 15, textAlign: 'center', padding: '40px 0' }}>No races match your filters.</p>
          ) : (
            Object.entries(byState)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([stateCode, { stateFull, races: stateRaces }]) => (
                <div key={stateCode} style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <p style={{ color: S.teal, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>{stateFull}</p>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(94,207,166,0.15)' }} />
                  </div>
                  {stateRaces.map(race => {
                    const isReady = race._count.questions >= 5 && race.candidates.length >= 2
                    return (
                      <div key={race.id} style={{ backgroundColor: S.bgCard, border: `1px solid ${isReady ? 'rgba(94,207,166,0.2)' : S.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: S.text, fontSize: 15, fontWeight: 600, margin: '0 0 3px' }}>{race.label}</p>
                            <p style={{ color: S.muted, fontSize: 12, margin: '0 0 8px' }}>
                              {race.chamber === 'SENATE' ? 'U.S. Senate' : 'U.S. House'}
                              {race.district ? ` · District ${race.district}` : ''}
                              {' · '}{race._count.questions} approved questions
                              {' · '}{race.candidates.length} candidates
                            </p>
                            {race.candidates.length > 0 && (
                              <p style={{ color: S.faint, fontSize: 11, margin: 0 }}>
                                {race.candidates.map((c, ci) => (
                                  <span key={c.id}>
                                    {ci > 0 && ' vs. '}
                                    <a href={`/candidates/${c.id}`} style={{ color: S.faint, textDecoration: 'underline', textDecorationColor: 'rgba(245,240,232,0.2)' }}>
                                      {c.firstName} {c.lastName}
                                    </a>
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                            <StatusBadge qCount={race._count.questions} candidateCount={race.candidates.length} />
                            {isReady && (
                              <a href={`/races/${race.id}/quiz`} style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '8px 16px', borderRadius: 5, fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                Take quiz →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(40px, 6vh, 72px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.75, marginBottom: 24 }}>
            Don't see your state? We add races through the 2026 cycle based on electoral competitiveness.
          </p>
          <a href="/#notify" style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '13px 28px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Notify me when my state is added →
          </a>
        </div>
      </section>
    </>
  )
}
