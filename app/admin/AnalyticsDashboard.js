'use client'
import { useState, useEffect } from 'react'

const PERIODS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

const BAR_COLORS = {
  oppose: '#E05A5A',
  neutral: '#A0A0A0',
  support: '#5ECFA6',
}

export default function AnalyticsDashboard({ adminSecret }) {
  const [period, setPeriod] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/analytics?days=${period}`, {
          headers: { 'x-admin-secret': adminSecret },
        })
        const json = await res.json()
        setData(json)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [period, adminSecret])

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#0F1B1F' }}>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: period === p.value ? '2px solid #D8AB69' : '1px solid #ccc',
              background: period === p.value ? '#0F1B1F' : '#fff',
              color: period === p.value ? '#D8AB69' : '#555',
              cursor: 'pointer',
              fontWeight: period === p.value ? 'bold' : 'normal',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#888' }}>Loading analytics…</p>}

      {data && (
        <>
          {/* Funnel */}
          <section style={{ marginBottom: 36 }}>
            <h3 style={{ borderBottom: '2px solid #D8AB69', paddingBottom: 6, marginBottom: 16 }}>
              Quiz Funnel
            </h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Started', key: 'started', color: '#5ECFA6' },
                { label: 'Completed', key: 'completed', color: '#D8AB69' },
                { label: 'Emailed', key: 'emailed', color: '#7AB8F5' },
                { label: 'Shared', key: 'shared', color: '#B89DE8' },
              ].map(({ label, key, color }) => (
                <div key={key} style={{
                  background: '#F5F0E8', border: `2px solid ${color}`,
                  borderRadius: 10, padding: '16px 24px', minWidth: 120, textAlign: 'center'
                }}>
                  <div style={{ fontSize: 36, fontWeight: 'bold', color }}>{data.funnel[key] ?? 0}</div>
                  <div style={{ fontSize: 13, color: '#555' }}>{label}</div>
                </div>
              ))}
            </div>
            {data.funnel.started > 0 && (
              <p style={{ marginTop: 12, color: '#555', fontSize: 14 }}>
                Completion rate:{' '}
                <strong>{Math.round((data.funnel.completed / data.funnel.started) * 100)}%</strong>
                {' '}· Email capture rate:{' '}
                <strong>{data.funnel.completed > 0
                  ? Math.round((data.funnel.emailed / data.funnel.completed) * 100) : 0}%</strong>
              </p>
            )}
          </section>

          {/* Issue Alignment Distributions */}
          <section style={{ marginBottom: 36 }}>
            <h3 style={{ borderBottom: '2px solid #D8AB69', paddingBottom: 6, marginBottom: 16 }}>
              Issue Alignment Distributions
            </h3>
            {data.issueDistributions.length === 0 && (
              <p style={{ color: '#888' }}>No alignment data yet.</p>
            )}
            {data.issueDistributions.map(row => (
              <div key={row.topic} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{row.topic}</span>
                  <span style={{ color: '#888' }}>{row.total} responses</span>
                </div>
                <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden', background: '#eee' }}>
                  {['oppose', 'neutral', 'support'].map(k => (
                    row[`${k}Percent`] > 0 && (
                      <div key={k} style={{
                        width: `${row[`${k}Percent`]}%`,
                        background: BAR_COLORS[k],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#fff', fontWeight: 600,
                        transition: 'width 0.4s',
                      }}>
                        {row[`${k}Percent`] > 8 ? `${row[`${k}Percent`]}%` : ''}
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {Object.entries(BAR_COLORS).map(([k, c]) => (
                <span key={k} style={{ fontSize: 12, color: '#555' }}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, background: c, borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} />
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </span>
              ))}
            </div>
          </section>

          {/* Candidate Match Patterns */}
          <section style={{ marginBottom: 36 }}>
            <h3 style={{ borderBottom: '2px solid #D8AB69', paddingBottom: 6, marginBottom: 16 }}>
              Candidate Match Patterns (Top 20)
            </h3>
            {data.candidatePatterns.length === 0 && <p style={{ color: '#888' }}>No result data yet.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.candidatePatterns.map(c => (
                <div key={c.candidateId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#F5F0E8', borderRadius: 8, padding: '8px 16px',
                }}>
                  <div style={{ fontWeight: 600, minWidth: 200 }}>{c.candidateName}</div>
                  <div style={{ flex: 1, height: 14, background: '#ddd', borderRadius: 7, overflow: 'hidden' }}>
                    <div style={{ width: `${c.avgScore}%`, height: '100%', background: '#5ECFA6', borderRadius: 7 }} />
                  </div>
                  <div style={{ fontWeight: 700, color: '#0F1B1F', minWidth: 48 }}>{c.avgScore}%</div>
                  <div style={{ color: '#888', fontSize: 13, minWidth: 80 }}>{c.quizCount} quiz{c.quizCount !== 1 ? 'zes' : ''}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Geography */}
          <section style={{ marginBottom: 36 }}>
            <h3 style={{ borderBottom: '2px solid #D8AB69', paddingBottom: 6, marginBottom: 16 }}>
              Geographic Engagement
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h4 style={{ marginBottom: 10, color: '#555' }}>Quiz Sessions by State</h4>
                {data.geography.sessions.slice(0, 15).map(s => (
                  <div key={s.state} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ width: 36, fontWeight: 700, fontSize: 13 }}>{s.state}</div>
                    <div style={{ flex: 1, height: 12, background: '#ddd', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.round((s.count / data.geography.sessions[0]?.count) * 100)}%`,
                        height: '100%', background: '#5ECFA6', borderRadius: 6,
                      }} />
                    </div>
                    <div style={{ fontSize: 13, minWidth: 28, textAlign: 'right' }}>{s.count}</div>
                  </div>
                ))}
              </div>
              <div>
                <h4 style={{ marginBottom: 10, color: '#555' }}>Waitlist by State</h4>
                {data.geography.waitlist.slice(0, 15).map(s => (
                  <div key={s.state} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ width: 36, fontWeight: 700, fontSize: 13 }}>{s.state}</div>
                    <div style={{ flex: 1, height: 12, background: '#ddd', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.round((s.count / (data.geography.waitlist[0]?.count || 1)) * 100)}%`,
                        height: '100%', background: '#D8AB69', borderRadius: 6,
                      }} />
                    </div>
                    <div style={{ fontSize: 13, minWidth: 28, textAlign: 'right' }}>{s.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
