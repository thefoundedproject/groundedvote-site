'use client'

// © 2026 The Founded Project LLC — All rights reserved.
// app/pulse/page.js — live anonymous aggregates from quiz activity.
// Small numbers are framed as progress toward thresholds, never as
// empty charts: a race earns its spread at 25 completions, the issue
// board at 40 "very important" marks.

import { useState, useEffect } from 'react'

const C = {
  bg: '#0F1B1F',
  bgCard: 'rgba(255,255,255,0.04)',
  gold: '#D8AB69',
  goldDim: 'rgba(216,171,105,0.4)',
  goldFaint: 'rgba(216,171,105,0.2)',
  text: '#F5F0E8',
  textMuted: 'rgba(245,240,232,0.6)',
  textFaint: 'rgba(245,240,232,0.35)',
  green: '#5ECFA6',
}

function Stat({ value, label }) {
  return (
    <div style={{ backgroundColor: C.bgCard, border: `1px solid ${C.goldFaint}`, borderRadius: 10, padding: '22px 24px' }}>
      <p style={{ color: C.text, fontSize: 34, fontWeight: 300, margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ color: C.textMuted, fontSize: 13, margin: '6px 0 0' }}>{label}</p>
    </div>
  )
}

function SectionTitle({ kicker, title }) {
  return (
    <>
      <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 10px' }}>{kicker}</p>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 300, margin: '0 0 18px' }}>{title}</h2>
    </>
  )
}

function ProgressBar({ n, max }) {
  const pct = Math.min(100, Math.round((n / max) * 100))
  return (
    <div style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 100 ? C.green : C.gold, transition: 'width 0.6s' }} />
    </div>
  )
}

export default function PulsePage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/pulse')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData)
      .catch(() => setError(true))
  }, [])

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: 'clamp(32px, 7vh, 80px) 24px 100px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
          Pulse
        </p>
        <h1 style={{ color: C.text, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 10 }}>
          What the quiz is seeing, live.
        </h1>
        <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.65, maxWidth: 620, marginBottom: 8 }}>
          Every number on this page is an anonymous count across quiz sessions.
          This is alignment data from people who chose to take the quiz, and it
          measures them alone. It is no prediction of any election.
        </p>
        {data && (
          <p style={{ color: C.textFaint, fontSize: 12, marginBottom: 40 }}>
            Updated {new Date(data.updatedAt).toLocaleString()}
          </p>
        )}

        {error && (
          <p style={{ color: C.textMuted, fontSize: 14 }}>The counts are catching their breath. Reload in a minute.</p>
        )}
        {!data && !error && (
          <p style={{ color: C.textFaint, fontSize: 14 }}>Counting…</p>
        )}

        {data && (
          <>
            {/* The engine */}
            <section style={{ marginBottom: 52 }}>
              <SectionTitle kicker="The engine" title="What stands ready for November 3" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <Stat value={data.engine.races} label="races on the ballot engine" />
                <Stat value={data.engine.questionsAudited.toLocaleString()} label="questions through the bias audit" />
                <Stat value={data.engine.stateRaces} label="state legislative races covered" />
                <Stat value={data.engine.states} label="states with live races" />
              </div>
            </section>

            {/* Activity */}
            <section style={{ marginBottom: 52 }}>
              <SectionTitle kicker="Activity" title="Quiz sessions so far" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <Stat value={data.activity.totalSessions} label="quiz sessions started" />
                <Stat value={data.activity.completedSessions} label="finished with results" />
                <Stat value={data.activity.weekSessions} label="started this week" />
                <Stat value={data.activity.answersRecorded.toLocaleString()} label="answers recorded" />
              </div>
            </section>

            {/* Issues */}
            <section style={{ marginBottom: 52 }}>
              <SectionTitle kicker="Issues" title="What quiz-takers mark as very important" />
              {data.issues.ready ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.issues.topIssues.map(t => (
                    <div key={t.topic}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: C.text, fontSize: 14, textTransform: 'capitalize' }}>{t.topic.replace(/[_-]/g, ' ')}</span>
                        <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>{t.share}%</span>
                      </div>
                      <ProgressBar n={t.share} max={100} />
                    </div>
                  ))}
                  <p style={{ color: C.textFaint, fontSize: 12, marginTop: 6 }}>
                    Share of all "very important" marks, across every race.
                  </p>
                </div>
              ) : (
                <div style={{ backgroundColor: C.bgCard, border: `1px solid ${C.goldFaint}`, borderRadius: 10, padding: '22px 24px' }}>
                  <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, margin: '0 0 14px' }}>
                    The issue board opens at {data.issues.threshold} "very important" marks,
                    so no handful of early sessions can pass itself off as a trend.
                  </p>
                  <ProgressBar n={data.issues.totalMarks} max={data.issues.threshold} />
                  <p style={{ color: C.textFaint, fontSize: 12, margin: '8px 0 0' }}>
                    {data.issues.totalMarks} of {data.issues.threshold} collected
                  </p>
                </div>
              )}
            </section>

            {/* Race spreads */}
            <section style={{ marginBottom: 52 }}>
              <SectionTitle kicker="Races" title="Alignment spreads by race" />
              {data.races.spreads.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  {data.races.spreads.map(s => (
                    <div key={s.label} style={{ backgroundColor: C.bgCard, border: `1px solid ${C.goldDim}`, borderRadius: 10, padding: '20px 24px' }}>
                      <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{s.label}</p>
                      <p style={{ color: C.textFaint, fontSize: 12, margin: '0 0 14px' }}>{s.completions} completed sessions</p>
                      {s.candidates.map(c => (
                        <div key={c.name} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: C.textMuted, fontSize: 13 }}>{c.name}</span>
                            <span style={{ color: C.gold, fontSize: 13, fontWeight: 700 }}>{c.avgScore}% avg alignment</span>
                          </div>
                          <ProgressBar n={c.avgScore} max={100} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ backgroundColor: C.bgCard, border: `1px solid ${C.goldFaint}`, borderRadius: 10, padding: '22px 24px' }}>
                <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
                  A race shows its spread after {data.races.threshold} completed sessions.
                  Here is how close each race stands.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {data.races.progress.length === 0 && (
                    <p style={{ color: C.textFaint, fontSize: 13, margin: 0 }}>The first completed quiz starts this board.</p>
                  )}
                  {data.races.progress.map(r => (
                    <div key={r.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ color: C.text, fontSize: 13 }}>{r.label}</span>
                        <span style={{ color: C.textFaint, fontSize: 12 }}>{r.completions} / {r.threshold}</span>
                      </div>
                      <ProgressBar n={r.completions} max={r.threshold} />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section style={{ textAlign: 'center', paddingTop: 10 }}>
              <p style={{ color: C.textMuted, fontSize: 15, marginBottom: 18 }}>
                Every quiz you finish moves these numbers.
              </p>
              <a
                href="/align"
                style={{ display: 'inline-block', backgroundColor: C.gold, color: C.bg, padding: '14px 36px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
              >
                Take the quiz →
              </a>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
