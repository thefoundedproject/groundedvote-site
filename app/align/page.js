'use client'

import { useState, useEffect, useRef } from 'react'

// ─── DATA ─────────────────────────────────────────────────────────────────────

// States that have seeded competitive race data for 2026.
// Derived from KEY_2026_RACES in lib/congress.js.
const ACTIVE_STATES = new Set([
  'AZ','CA','CO','GA','IA','ME','MI','MN','MT',
  'NC','NH','NM','NV','NY','OH','OR','PA','TX','VA','WA','WI',
])

const US_STATES = [
  ['AK','Alaska'],['AL','Alabama'],['AR','Arkansas'],['AZ','Arizona'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DC','Washington DC'],['DE','Delaware'],['FL','Florida'],
  ['GA','Georgia'],['HI','Hawaii'],['IA','Iowa'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['MA','Massachusetts'],['MD','Maryland'],
  ['ME','Maine'],['MI','Michigan'],['MN','Minnesota'],['MO','Missouri'],['MS','Mississippi'],
  ['MT','Montana'],['NC','North Carolina'],['ND','North Dakota'],['NE','Nebraska'],['NH','New Hampshire'],
  ['NJ','New Jersey'],['NM','New Mexico'],['NV','Nevada'],['NY','New York'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VA','Virginia'],
  ['VT','Vermont'],['WA','Washington'],['WI','Wisconsin'],['WV','West Virginia'],['WY','Wyoming'],
]

const ANSWER_LABELS = {
  1: 'Strongly Oppose',
  2: 'Oppose',
  3: 'Neutral',
  4: 'Support',
  5: 'Strongly Support',
}

const IMPORTANCE_OPTIONS = [
  { value: 1, label: 'Not a priority for me' },
  { value: 2, label: 'Somewhat important' },
  { value: 3, label: 'Very important to me' },
]

const TOPIC_LABELS = {
  HEALTHCARE: 'Healthcare', ECONOMY: 'Economy', IMMIGRATION: 'Immigration',
  ENVIRONMENT: 'Environment & Climate', EDUCATION: 'Education', HOUSING: 'Housing',
  CRIMINAL_JUSTICE: 'Criminal Justice', FOREIGN_POLICY: 'Foreign Policy',
  VOTING_RIGHTS: 'Voting Rights', SOCIAL_SECURITY: 'Social Security',
  DRUG_POLICY: 'Drug Policy', GUN_POLICY: 'Gun Policy', LABOR: 'Labor & Workers',
  TAXES: 'Taxes', VETERANS: 'Veterans', INFRASTRUCTURE: 'Infrastructure',
  TECHNOLOGY: 'Technology', OTHER: 'Other',
}

// ─── RESPONSIVE HOOK ─────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 600) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

// ─── COLOR TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg: '#0F1B1F',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(216,171,105,0.06)',
  gold: '#D8AB69',
  goldDim: 'rgba(216,171,105,0.4)',
  goldFaint: 'rgba(216,171,105,0.15)',
  text: '#F5F0E8',
  textMuted: 'rgba(245,240,232,0.5)',
  textFaint: 'rgba(245,240,232,0.3)',
  active: '#1A4A38',        // teal-dark for active state cards
  activeBorder: '#2D7A5C',  // teal border
  activeText: '#5ECFA6',    // teal text
  error: '#E57373',
}

// ─── ADDRESS ENTRY + STATE GRID ───────────────────────────────────────────────
function StateSelector({ onStateSelected }) {
  const [address, setAddress] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState(null)
  const [browsing, setBrowsing] = useState(false)
  const isMobile = useIsMobile()
  const inputRef = useRef(null)

  const handleGeocode = async (e) => {
    e.preventDefault()
    if (!address.trim()) return
    setGeocoding(true)
    setGeocodeError(null)
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      const data = await res.json()
      if (!res.ok || !data.stateCode) {
        setGeocodeError("We couldn't locate that address. Try including your city and state (e.g. \"123 Main St, Minneapolis, MN\").")
        return
      }
      onStateSelected(data.stateCode, data.stateName || data.stateCode, data.district ?? null)
    } catch {
      setGeocodeError('Lookup unavailable. Browse by state below.')
    } finally {
      setGeocoding(false)
    }
  }

  const activeCount = ACTIVE_STATES.size
  const totalCount = US_STATES.length

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, padding: 'clamp(24px, 7vh, 80px) 24px 60px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
          Civic Alignment · 2026 Elections
        </p>
        <h1 style={{ color: C.text, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, lineHeight: 1.15, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Where do you actually<br />stand?
        </h1>
        <p style={{ color: C.textMuted, fontSize: 16, lineHeight: 1.65, marginBottom: 48, maxWidth: 520 }}>
          Enter your address to find the competitive races on your ballot. Every question is bias-audited by AI before it reaches you. No party labels. Just your positions against theirs.
        </p>

        {/* Address form */}
        <form onSubmit={handleGeocode} style={{ marginBottom: 16 }}>
          <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Your Address
          </label>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
            <input
              ref={inputRef}
              type="text"
              value={address}
              onChange={e => { setAddress(e.target.value); setGeocodeError(null) }}
              placeholder="123 Main St, Minneapolis, MN 55401"
              style={{
                flex: 1, padding: '14px 18px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${geocodeError ? C.error : C.goldFaint}`,
                borderRadius: 6, fontSize: 15, color: C.text,
                outline: 'none', transition: 'border-color 0.15s',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = C.gold }}
              onBlur={e => { e.currentTarget.style.borderColor = geocodeError ? C.error : C.goldFaint }}
              disabled={geocoding}
            />
            <button
              type="submit"
              disabled={!address.trim() || geocoding}
              style={{
                padding: '14px 24px', borderRadius: 6, fontWeight: 700, fontSize: 14,
                border: 'none', cursor: address.trim() && !geocoding ? 'pointer' : 'default',
                backgroundColor: address.trim() ? C.gold : 'rgba(216,171,105,0.25)',
                color: '#0F1B1F', whiteSpace: 'nowrap', transition: 'all 0.15s',
                opacity: geocoding ? 0.7 : 1, width: isMobile ? '100%' : 'auto',
              }}
            >
              {geocoding ? 'Looking up...' : 'Find my races →'}
            </button>
          </div>
          {geocodeError && (
            <p style={{ color: C.error, fontSize: 13, marginTop: 8 }}>{geocodeError}</p>
          )}
        </form>

        <p style={{ color: C.textFaint, fontSize: 12, marginBottom: 48 }}>
          Your address is used only to determine your state and district. It is never stored.
        </p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(216,171,105,0.12)' }} />
          <p style={{ color: C.textFaint, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Or browse by state</p>
          <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(216,171,105,0.12)' }} />
        </div>

        {/* Coverage stat */}
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 24 }}>
          <span style={{ color: C.activeText, fontWeight: 700 }}>{activeCount} states</span> have live race data for 2026. {totalCount - activeCount} states are coming soon.
        </p>

        {/* State grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
          {US_STATES.map(([code, name]) => {
            const isActive = ACTIVE_STATES.has(code)
            return (
              <StateCard
                key={code}
                code={code}
                name={name}
                isActive={isActive}
                onClick={() => isActive && onStateSelected(code, name)}
              />
            )
          })}
        </div>

      </div>
    </div>
  )
}

function StateCard({ code, name, isActive, onClick }) {
  const [hovered, setHovered] = useState(false)

  const base = {
    padding: '10px 6px',
    borderRadius: 6,
    textAlign: 'center',
    cursor: isActive ? 'pointer' : 'default',
    transition: 'all 0.15s',
    border: `1.5px solid ${isActive
      ? (hovered ? C.activeBorder : 'rgba(45,122,92,0.5)')
      : 'rgba(255,255,255,0.06)'}`,
    backgroundColor: isActive
      ? (hovered ? 'rgba(30,90,62,0.5)' : 'rgba(26,74,56,0.35)')
      : 'rgba(255,255,255,0.02)',
    position: 'relative',
  }

  return (
    <div
      style={base}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isActive ? `${name} — race data available` : `${name} — coming soon`}
    >
      <p style={{ color: isActive ? C.activeText : C.textFaint, fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 2 }}>{code}</p>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, color: isActive ? 'rgba(94,207,166,0.7)' : C.textFaint }}>
        {isActive ? 'LIVE' : 'SOON'}
      </p>
    </div>
  )
}

// ─── RACE SELECTOR (after state is picked) ───────────────────────────────────
// Statewide ballot measures shown under the race list. Display only for
// now — measure questions join the quiz in a later pass.
function MeasuresBlock({ stateCode }) {
  const [measures, setMeasures] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => {
    fetch(`/api/measures?state=${stateCode}`)
      .then(r => r.json())
      .then(data => setMeasures(data.measures || []))
      .catch(() => {})
  }, [stateCode])

  if (!measures.length) return null

  return (
    <div style={{ marginTop: 40 }}>
      <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
        Also on your ballot
      </p>
      <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        {measures.length} statewide measure{measures.length > 1 ? 's' : ''}. Summaries from Wikipedia (CC BY-SA); full analysis linked per measure.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {measures.map(m => (
          <div key={m.id} style={{ backgroundColor: C.bgCard, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '14px 18px' }}>
            <button
              onClick={() => setOpen(open === m.id ? null : m.id)}
              style={{ background: 'none', border: 'none', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'left', width: '100%' }}
            >
              {m.title} <span style={{ color: C.textFaint, fontWeight: 400 }}>{open === m.id ? '−' : '+'}</span>
            </button>
            {open === m.id && (
              <div style={{ marginTop: 10 }}>
                <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.65, margin: '0 0 10px' }}>{m.description}</p>
                {m.yesPosition && <p style={{ color: C.activeText, fontSize: 12, lineHeight: 1.6, margin: '0 0 6px' }}>{m.yesPosition}</p>}
                {m.noPosition && <p style={{ color: C.error, fontSize: 12, lineHeight: 1.6, margin: '0 0 10px' }}>{m.noPosition}</p>}
                {m.sourceUrl && (
                  <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, fontSize: 12, textDecoration: 'none' }}>
                    Full text and analysis on Ballotpedia →
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RaceSelector({ stateCode, stateName, district, onSelect, onBack }) {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // With a district (address entry): Senate races and the user's own House
  // district are their ballot; other House districts move below the fold.
  const onBallot = district
    ? races.filter(r => r.chamber === 'SENATE' || r.district === district)
    : races
  const elsewhere = district ? races.filter(r => !onBallot.includes(r)) : []

  useEffect(() => {
    fetch(`/api/races?state=${stateCode}`)
      .then(r => r.json())
      .then(data => setRaces(data.races || []))
      .catch(() => setError('Could not load races. Please try again.'))
      .finally(() => setLoading(false))
  }, [stateCode])

  const isComingSoon = !ACTIVE_STATES.has(stateCode)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, padding: 'clamp(24px, 7vh, 80px) 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back
        </button>

        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          {stateName}
        </p>
        <h1 style={{ color: C.text, fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>
          2026 Competitive Races
        </h1>

        {isComingSoon ? (
          <ComingSoonBlock stateName={stateName} stateCode={stateCode} />
        ) : loading ? (
          <p style={{ color: C.textMuted, fontSize: 14 }}>Loading races...</p>
        ) : error ? (
          <p style={{ color: C.error, fontSize: 14 }}>{error}</p>
        ) : races.length === 0 ? (
          <ComingSoonBlock stateName={stateName} stateCode={stateCode} />
        ) : (
          <>
            <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
              {district
                ? `Based on your address: District ${district}. These races are on your ballot.`
                : `${races.length} race${races.length > 1 ? 's' : ''} available. Select one to begin the bias-audited alignment quiz.`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onBallot.map(race => (
                <RaceCard key={race.id} race={race} onClick={() => onSelect(race)} />
              ))}
            </div>
            {district && onBallot.length === 0 && (
              <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
                None of the races on your specific ballot are covered yet. Nearby races in your state are below, and statewide measures apply to you either way.
              </p>
            )}
            {elsewhere.length > 0 && (
              <>
                <p style={{ color: C.textFaint, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '32px 0 12px' }}>
                  Elsewhere in {stateName}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {elsewhere.map(race => (
                    <RaceCard key={race.id} race={race} onClick={() => onSelect(race)} />
                  ))}
                </div>
              </>
            )}
            <MeasuresBlock stateCode={stateCode} />
          </>
        )}
      </div>
    </div>
  )
}

function RaceCard({ race, onClick }) {
  const [hovered, setHovered] = useState(false)
  const qCount = race._count?.questions ?? 0
  const cCount = race.candidates?.length ?? 0

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: 'left', padding: '22px 26px', borderRadius: 8,
        backgroundColor: hovered ? C.bgCardHover : C.bgCard,
        border: `1.5px solid ${hovered ? C.goldDim : C.goldFaint}`,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <p style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{race.label}</p>
          <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
            {race.chamber === 'SENATE' ? 'U.S. Senate' : `U.S. House — District ${race.district}`}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {qCount >= 5 ? (
            <span style={{ backgroundColor: 'rgba(94,207,166,0.15)', color: C.activeText, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              Ready
            </span>
          ) : (
            <span style={{ backgroundColor: 'rgba(216,171,105,0.12)', color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              Generating
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <p style={{ color: C.textFaint, fontSize: 12, margin: 0 }}>
          <span style={{ color: C.textMuted, fontWeight: 600 }}>{cCount}</span> candidates
        </p>
        <p style={{ color: C.textFaint, fontSize: 12, margin: 0 }}>
          <span style={{ color: C.textMuted, fontWeight: 600 }}>{qCount}</span> bias-audited questions
        </p>
      </div>
    </button>
  )
}

function ComingSoonBlock({ stateName, stateCode }) {
  return (
    <div style={{ padding: '32px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(216,171,105,0.12)', marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(216,171,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 22 }}>🗺</span>
        </div>
        <div>
          <p style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
            {stateName} — Coming Soon
          </p>
          <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.65, marginBottom: 20 }}>
            We are mapping competitive races and building the candidate data pipeline for {stateName}. We add races regularly through the 2026 election cycle. Get notified when your state goes live.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={`/#notify?state=${stateCode}`}
              style={{ backgroundColor: C.gold, color: '#0F1B1F', padding: '12px 22px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', display: 'inline-block' }}
            >
              Notify me when {stateCode} is live →
            </a>
            <a
              href="/align"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: C.textMuted, padding: '12px 22px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'inline-block', border: '1px solid rgba(216,171,105,0.15)' }}
            >
              Browse other states
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── QUIZ QUESTIONS (with importance weighting) ───────────────────────────────
function QuizQuestions({ race, sessionId, questions, onComplete }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})     // {questionId: 1-5}
  const [importance, setImportance] = useState({}) // {questionId: 1-3}
  const [showImportance, setShowImportance] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const question = questions[step]
  const progress = ((step) / questions.length) * 100

  const currentAnswer = answers[question?.id]
  const currentImportance = importance[question?.id] ?? 2 // default: somewhat important

  const handleAnswer = (value) => {
    setAnswers(prev => {
      const next = { ...prev, [question.id]: value }
      // Local backup: if the network drops mid-quiz, answers survive a reload
      try { localStorage.setItem(`gv-quiz-${sessionId}`, JSON.stringify(next)) } catch {}
      return next
    })
    setShowImportance(true)
  }

  const handleImportance = (value) => {
    setImportance(prev => ({ ...prev, [question.id]: value }))
  }

  const handleNext = async () => {
    if (step < questions.length - 1) {
      setStep(s => s + 1)
      setShowImportance(!!answers[questions[step + 1]?.id])
    } else {
      setSubmitting(true)
      setError(null)
      try {
        const res = await fetch('/api/quiz-session/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            answers: Object.entries(answers).map(([questionId, answerValue]) => ({
              questionId,
              answerValue,
              importance: importance[questionId] ?? 2,
            })),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Submission failed')
        onComplete(data)
      } catch (err) {
        setError(err.message)
        setSubmitting(false)
      }
    }
  }

  const canProceed = !!currentAnswer

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'flex-start', padding: 'clamp(24px, 7vh, 80px) 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ color: 'rgba(216,171,105,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{race.label}</p>
          <p style={{ color: C.textFaint, fontSize: 11 }}>{step + 1} / {questions.length}</p>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(216,171,105,0.12)', marginBottom: 48 }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, backgroundColor: C.gold, transition: 'width 0.3s ease' }} />
        </div>

        {/* Topic badge */}
        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
          {TOPIC_LABELS[question.topic] || question.topic}
        </p>

        {/* Question */}
        <h2 style={{ color: C.text, fontSize: 'clamp(19px, 2.5vw, 25px)', fontWeight: 300, lineHeight: 1.55, marginBottom: 36, letterSpacing: '-0.01em' }}>
          {question.questionText}
        </h2>

        {/* Answer scale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 28 }}>
          {[1, 2, 3, 4, 5].map(val => {
            const sel = currentAnswer === val
            return (
              <button
                key={val}
                onClick={() => handleAnswer(val)}
                style={{
                  textAlign: 'left', padding: '14px 20px', borderRadius: 8, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.12s',
                  backgroundColor: sel ? C.gold : C.bgCard,
                  color: sel ? '#0F1B1F' : C.text,
                  border: `1.5px solid ${sel ? C.gold : C.goldFaint}`,
                  fontWeight: sel ? 600 : 400,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontFamily: 'inherit',
                }}
              >
                <span>{ANSWER_LABELS[val]}</span>
                <span style={{ fontSize: 11, opacity: 0.45 }}>{val}/5</span>
              </button>
            )
          })}
        </div>

        {/* Importance selector — appears after answer is chosen */}
        {showImportance && currentAnswer && (
          <div style={{ marginBottom: 32, padding: '18px 20px', borderRadius: 8, backgroundColor: 'rgba(216,171,105,0.04)', border: `1px solid ${C.goldFaint}`, transition: 'opacity 0.2s' }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              How much does this issue matter to you?
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {IMPORTANCE_OPTIONS.map(opt => {
                const sel = currentImportance === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleImportance(opt.value)}
                    style={{
                      padding: '12px 16px', borderRadius: 20, fontSize: 13, fontWeight: sel ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit', border: 'none',
                      backgroundColor: sel ? C.gold : 'rgba(255,255,255,0.08)',
                      color: sel ? '#0F1B1F' : C.textMuted,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && <p style={{ color: C.error, fontSize: 13, marginBottom: 14 }}>{error}</p>}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 0 ? (
            <button
              onClick={() => { setStep(s => s - 1); setShowImportance(true) }}
              style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 13, cursor: 'pointer', padding: 0 }}
            >
              ← Back
            </button>
          ) : <span />}
          <button
            onClick={handleNext}
            disabled={!canProceed || submitting}
            style={{
              backgroundColor: canProceed ? C.gold : 'rgba(216,171,105,0.2)',
              color: '#0F1B1F', padding: '13px 30px', borderRadius: 6,
              fontWeight: 700, fontSize: 14, border: 'none',
              cursor: canProceed && !submitting ? 'pointer' : 'default',
              opacity: (canProceed && !submitting) ? 1 : 0.5, transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {submitting ? 'Computing matches...' : step === questions.length - 1 ? 'See my results →' : 'Continue →'}
          </button>
        </div>

        {/* Reassurance footer */}
        <p style={{ color: C.textFaint, fontSize: 11, marginTop: 28, textAlign: 'center', lineHeight: 1.6 }}>
          Every question was bias-audited before reaching you. Party affiliations are never shown.
        </p>
      </div>
    </div>
  )
}

// ─── SOURCE BADGE ─────────────────────────────────────────────────────────────
const SOURCE_BADGE_CONFIG = {
  VOTING_RECORD:      { label: 'Voting record', color: '#5ECFA6', bg: 'rgba(94,207,166,0.12)' },
  PUBLIC_STATEMENT:   { label: 'Public statement', color: '#7EC8E3', bg: 'rgba(126,200,227,0.12)' },
  CAMPAIGN_PLATFORM:  { label: 'Campaign platform', color: '#B8A0D8', bg: 'rgba(184,160,216,0.12)' },
  PARTY_INFERENCE:    { label: 'Party inference', color: '#D8AB69', bg: 'rgba(216,171,105,0.12)' },
  QUESTIONNAIRE:      { label: 'Questionnaire', color: '#5ECFA6', bg: 'rgba(94,207,166,0.12)' },
}

function SourceBadge({ sourceNote, confidence }) {
  if (!sourceNote) return null
  const typeMatch = sourceNote.match(/^\[([A-Z_]+)\]/)
  const type = typeMatch?.[1] ?? 'PUBLIC_STATEMENT'
  const cfg = SOURCE_BADGE_CONFIG[type] ?? SOURCE_BADGE_CONFIG.PUBLIC_STATEMENT
  const confPct = Math.round((confidence ?? 1) * 100)
  return (
    <span title={sourceNote.replace(/^\[[A-Z_]+\]\s*/, '')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 3 }}>
        {cfg.label}
      </span>
      {confidence < 0.65 && (
        <span style={{ color: 'rgba(216,171,105,0.6)', fontSize: 9, fontWeight: 700 }} title="Lower confidence — limited direct evidence">
          ~{confPct}%
        </span>
      )}
    </span>
  )
}

const ANSWER_LABELS_SHORT = { 1: 'Strongly Oppose', 2: 'Oppose', 3: 'Neutral', 4: 'Support', 5: 'Strongly Support' }
const ANSWER_DOT_COLOR = { 1: '#E57373', 2: '#FF9C6E', 3: '#6b8e96', 4: '#7EC8E3', 5: '#5ECFA6' }

// ─── RESULTS ──────────────────────────────────────────────────────────────────
// The before/after reveal — compares the user's pre-quiz stated preference
// with what their answers showed. Rendered only when the pre-question was
// answered (named a candidate or typed a name).
function BeforeAfterReveal({ preVote, scores }) {
  if (!preVote || !scores?.length) return null

  const top = scores[0]
  const topName = `${top.candidate.firstName} ${top.candidate.lastName}`
  const topScore = Math.round(top.alignmentScore)

  let heading, body
  if (preVote.candidateId) {
    const preEntry = scores.find(s => s.candidateId === preVote.candidateId)
    const preName = preVote.name ?? (preEntry ? `${preEntry.candidate.firstName} ${preEntry.candidate.lastName}` : 'your pick')
    const preScore = preEntry ? Math.round(preEntry.alignmentScore) : null

    if (preVote.candidateId === top.candidateId) {
      heading = 'Your answers agree with you.'
      body = `Before the quiz, you said you would vote for ${preName}. Your answers point the same way: ${topName} is your closest match at ${topScore}%.`
    } else {
      heading = 'Your answers point somewhere else.'
      body = `Before the quiz, you said you would vote for ${preName}${preScore !== null ? `, who matched ${preScore}% of your answers` : ''}. Your closest match is ${topName} at ${topScore}%. The compare view below shows where the gap comes from, issue by issue.`
    }
  } else if (preVote.rawText) {
    heading = 'What you said, next to what you showed.'
    body = `Before the quiz, you wrote "${preVote.rawText}". Your answers put ${topName} closest at ${topScore}%. Worth a look at how those two compare.`
  } else {
    return null
  }

  return (
    <div style={{ backgroundColor: 'rgba(216,171,105,0.06)', border: `1px solid ${C.goldDim}`, borderRadius: 10, padding: '22px 26px', marginBottom: 36 }}>
      <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
        Before · After
      </p>
      <p style={{ color: C.text, fontSize: 17, fontWeight: 600, margin: '0 0 8px' }}>{heading}</p>
      <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{body}</p>
    </div>
  )
}

function Results({ scores, topIssues, race, sessionId, preVote, measureAnswers, onRetake }) {
  const [emailVal, setEmailVal] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [view, setView] = useState('scores')    // 'scores' | 'compare'
  const [breakdown, setBreakdown] = useState(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [compareIdx, setCompareIdx] = useState(0) // which candidate to focus on mobile
  const [copied, setCopied] = useState(false)
  const [convictions, setConvictions] = useState({})   // candidateId -> {summary, loaded}
  const isMobile = useIsMobile()

  const getMatchLabel = (score) => {
    if (score >= 80) return 'Strong Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Partial Match'
    return 'Low Match'
  }
  const getMatchColor = (score) => {
    if (score >= 80) return C.gold
    if (score >= 60) return 'rgba(216,171,105,0.7)'
    if (score >= 40) return 'rgba(216,171,105,0.45)'
    return C.textFaint
  }

  const getCandidatePhoto = (c) => {
    if (c.candidate?.photoUrl) return c.candidate.photoUrl
    if (c.candidate?.bioguideId) {
      const first = c.candidate.bioguideId[0].toUpperCase()
      return `https://bioguide.congress.gov/bioguide/photo/${first}/${c.candidate.bioguideId}.jpg`
    }
    return null
  }
  const getInitials = (c) => `${c.candidate?.firstName?.[0] ?? ''}${c.candidate?.lastName?.[0] ?? ''}`.toUpperCase()

    const handleCopyShare = () => {
    const top = scores[0]
    const text = `I'm a ${top.alignmentScore}% match with ${top.candidate.firstName} ${top.candidate.lastName} on the ${race.label}. No party labels — just issues. Find yours: groundedvote.com/align`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

    const loadConvictions = async (candidateId) => {
    if (convictions[candidateId]) return // already loaded
    setConvictions(prev => ({ ...prev, [candidateId]: { loading: true } }))
    try {
      const res = await fetch(`/api/conviction?candidateId=${candidateId}`)
      const data = await res.json()
      setConvictions(prev => ({ ...prev, [candidateId]: { summary: data.summary, loaded: true } }))
    } catch {
      setConvictions(prev => ({ ...prev, [candidateId]: { loaded: true } }))
    }
  }

    const handleEmailResults = async (e) => {
    e.preventDefault()
    if (!emailVal) return
    setEmailSending(true)
    try {
      await fetch('/api/email-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, scores, race }),
      })
      setEmailSent(true)
    } catch { /* silent */ }
    setEmailSending(false)
  }

  const loadBreakdown = async () => {
    if (breakdown || !sessionId) return
    setBreakdownLoading(true)
    try {
      const res = await fetch(`/api/quiz-session/results?sessionId=${sessionId}`)
      const data = await res.json()
      if (data.breakdown) setBreakdown(data.breakdown)
    } catch { /* ignore */ }
    setBreakdownLoading(false)
  }

  const handleViewChange = (v) => {
    setView(v)
    if (v === 'compare') loadBreakdown()
  }

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: 'clamp(24px, 7vh, 80px) 24px 100px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
          Your Civic Mirror
        </p>
        <h1 style={{ color: C.text, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 300, lineHeight: 1.15, marginBottom: 6, letterSpacing: '-0.02em' }}>
          {race.label}
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 36 }}>
          Weighted by your stated issue priorities — no party labels shown.
        </p>

        <BeforeAfterReveal preVote={preVote} scores={scores} />

        <MeasureLeanings measureAnswers={measureAnswers} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
          {['scores', 'compare'].map(v => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              style={{
                padding: '8px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                backgroundColor: view === v ? C.gold : 'rgba(255,255,255,0.07)',
                color: view === v ? '#0F1B1F' : C.textMuted,
                textTransform: 'capitalize', transition: 'all 0.15s',
              }}
            >
              {v === 'scores' ? 'Match Scores' : 'Compare Side-by-Side'}
            </button>
          ))}
        </div>

        {/* ── SCORES VIEW ── */}
        {view === 'scores' && (
          <>
            {/* Candidate score cards */}
            <div style={{ marginBottom: 52 }}>
              {scores.map((candidate, i) => (
                <div key={candidate.candidateId} style={{
                  marginBottom: 10, padding: '22px 26px',
                  backgroundColor: i === 0 ? 'rgba(216,171,105,0.05)' : C.bgCard,
                  borderRadius: 8, border: `1.5px solid ${i === 0 ? 'rgba(216,171,105,0.3)' : C.goldFaint}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Candidate avatar */}
                      {(() => {
                        const photo = getCandidatePhoto(candidate)
                        const initials = getInitials(candidate)
                        return photo ? (
                          <img
                            src={photo}
                            alt={candidate.candidateName}
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                            style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover', flexShrink: 0, border: `2px solid ${i === 0 ? C.gold : C.goldFaint}` }}
                          />
                        ) : null
                      })()}
                      <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(216,171,105,0.15)', border: `2px solid ${C.goldFaint}`, display: getCandidatePhoto(candidate) ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: C.gold, fontWeight: 700, fontSize: 14 }}>{getInitials(candidate)}</span>
                      </div>
                      <div>
                        <p style={{ color: C.text, fontSize: 18, fontWeight: 600, margin: 0 }}>{candidate.candidateName}</p>
                        {i === 0 && (
                          <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 3 }}>
                            Closest Match
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: getMatchColor(candidate.score), fontSize: 30, fontWeight: 700, margin: 0, lineHeight: 1 }}>
                        {candidate.score}%
                      </p>
                      <p style={{ color: C.textFaint, fontSize: 11, marginTop: 3 }}>{getMatchLabel(candidate.score)}</p>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                    <div style={{ width: `${candidate.score}%`, height: '100%', borderRadius: 3, backgroundColor: getMatchColor(candidate.score), transition: 'width 1.2s ease' }} />
                  </div>
                  {candidate.candidate?.bioguideId && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {convictions[candidate.candidateId]?.loaded ? (
                        convictions[candidate.candidateId]?.summary ? (
                          <span style={{ fontSize: 11, color: C.textMuted }}>
                            Voting record: {' '}
                            <span style={{ color: C.activeText }}>✓ {convictions[candidate.candidateId].summary.consistent} consistent</span>
                            {convictions[candidate.candidateId].summary.inconsistent > 0 && (
                              <span style={{ color: '#E57373' }}> · ⚠ {convictions[candidate.candidateId].summary.inconsistent} inconsistent</span>
                            )}
                          </span>
                        ) : <span style={{ fontSize: 11, color: C.textFaint }}>No voting record data available</span>
                      ) : (
                        <button
                          onClick={() => loadConvictions(candidate.candidateId)}
                          style={{ backgroundColor: 'transparent', border: `1px solid ${C.goldFaint}`, color: C.textMuted, fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {convictions[candidate.candidateId]?.loading ? 'Checking record…' : 'Check voting record'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Top divergence issues */}
            {topIssues.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <p style={{ color: C.textFaint, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Where You Diverged Most
                </p>
                {topIssues.slice(0, 5).map((issue, i) => (
                  <div key={i} style={{ padding: '15px 0', borderTop: '1px solid rgba(216,171,105,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                        {TOPIC_LABELS[issue.topic]}
                      </p>
                      <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{issue.questionText}</p>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 100, flexShrink: 0 }}>
                      <p style={{ color: C.textFaint, fontSize: 10, marginBottom: 2 }}>Your answer</p>
                      <p style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{ANSWER_LABELS[issue.userValue]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── COMPARE VIEW ── */}
        {view === 'compare' && (
          <div style={{ marginBottom: 52 }}>
            {breakdownLoading && (
              <p style={{ color: C.textMuted, fontSize: 14 }}>Loading comparison data...</p>
            )}

            {breakdown && breakdown.length > 0 && (
              <>
                {/* Mobile: candidate tabs */}
                {scores.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                    <div style={{ padding: '7px 14px', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', fontSize: 11, fontWeight: 600, color: C.textFaint, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      You
                    </div>
                    {scores.map((c, i) => (
                      <button
                        key={c.candidateId}
                        onClick={() => setCompareIdx(i)}
                        style={{
                          padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                          backgroundColor: compareIdx === i ? C.gold : 'rgba(255,255,255,0.06)',
                          color: compareIdx === i ? '#0F1B1F' : C.textMuted,
                          whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s',
                        }}
                      >
                        {c.candidateName.split(' ').slice(-1)[0]} — {c.score}%
                      </button>
                    ))}
                  </div>
                )}

                {/* Comparison table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 120px' : `1fr repeat(${Math.min(scores.length, 3)}, 130px)`,
                  gap: 0,
                  backgroundColor: 'rgba(216,171,105,0.06)',
                  borderRadius: '8px 8px 0 0',
                  border: `1px solid ${C.goldFaint}`,
                  borderBottom: 'none',
                  padding: '12px 16px',
                }}>
                  <div style={{ color: C.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Issue · Your Position
                  </div>
                  {(isMobile ? scores.slice(compareIdx, compareIdx + 1) : scores.slice(0, 3)).map((c, i) => (
                    <div key={c.candidateId} style={{ textAlign: 'center', color: i === 0 && !isMobile ? C.gold : compareIdx === scores.indexOf(c) ? C.gold : C.textMuted, fontSize: 11, fontWeight: 700 }}>
                      {c.candidateName.split(' ').slice(-1)[0]}
                      <span style={{ display: 'block', fontSize: 9, fontWeight: 400, color: C.textFaint, marginTop: 2 }}>
                        {c.score}% match
                      </span>
                    </div>
                  ))}
                </div>

                {/* Comparison rows */}
                <div style={{ border: `1px solid ${C.goldFaint}`, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                  {breakdown.map((row, idx) => (
                    <div
                      key={row.questionId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr 120px' : `1fr repeat(${Math.min(scores.length, 3)}, 130px)`,
                        borderTop: idx > 0 ? `1px solid rgba(216,171,105,0.07)` : 'none',
                        padding: '14px 16px',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        alignItems: 'start',
                        gap: 0,
                      }}
                    >
                      {/* Issue column */}
                      <div style={{ paddingRight: 16 }}>
                        <p style={{ color: C.gold, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                          {TOPIC_LABELS[row.topic]}
                          {row.importance === 3 && <span style={{ marginLeft: 6, color: 'rgba(94,207,166,0.7)' }}>★</span>}
                        </p>
                        <p style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.45, margin: '0 0 6px' }}>{row.questionText}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ANSWER_DOT_COLOR[row.userValue], display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 600 }}>{ANSWER_LABELS_SHORT[row.userValue]}</span>
                        </div>
                      </div>

                      {/* Candidate columns */}
                      {(isMobile ? scores.slice(compareIdx, compareIdx + 1) : scores.slice(0, 3)).map(scoreEntry => {
                        const ca = row.candidates.find(c => c.candidateId === scoreEntry.candidateId)
                        if (!ca) return (
                          <div key={scoreEntry.candidateId} style={{ textAlign: 'center', paddingTop: 4 }}>
                            <span style={{ color: C.textFaint, fontSize: 11 }}>—</span>
                          </div>
                        )
                        const diff = Math.abs(row.userValue - ca.answerValue)
                        const agree = diff <= 1
                        const rawSource = ca.sourceNote?.replace(/^\[[A-Z_]+\]\s*/, '') ?? null
                        const sourceType = ca.sourceNote?.match(/^\[([A-Z_]+)\]/)?.[1] ?? null
                        const sourceCfg = sourceType ? SOURCE_BADGE_CONFIG[sourceType] : null
                        return (
                          <div key={ca.candidateId} style={{ textAlign: 'center', paddingTop: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 5 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ANSWER_DOT_COLOR[ca.answerValue], display: 'inline-block' }} />
                              <span style={{ color: agree ? C.activeText : C.textMuted, fontSize: 11, fontWeight: 600 }}>
                                {ANSWER_LABELS_SHORT[ca.answerValue]}
                              </span>
                            </div>
                            {diff === 0 && <span style={{ color: C.activeText, fontSize: 9, fontWeight: 700 }}>Match</span>}
                            {diff >= 3 && <span style={{ color: '#E57373', fontSize: 9, fontWeight: 700 }}>Diverge</span>}
                            {sourceCfg && (
                              <div style={{ marginTop: 4 }}>
                                <span
                                  title={rawSource}
                                  style={{ backgroundColor: sourceCfg.bg, color: sourceCfg.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', padding: '2px 5px', borderRadius: 3, textTransform: 'uppercase', cursor: 'help' }}
                                >
                                  {sourceCfg.label}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

                <p style={{ color: C.textFaint, fontSize: 11, marginTop: 12 }}>
                  ★ = issue you marked "Very important" · hover source badges for evidence detail
                </p>
              </>
            )}

            {!breakdownLoading && !breakdown && (
              <p style={{ color: C.textMuted, fontSize: 14 }}>Comparison data not available for this session.</p>
            )}
          </div>
        )}

        {/* Email results */}
        <div style={{ marginBottom: 36, padding: '22px 24px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${C.goldFaint}` }}>
          <p style={{ color: C.textMuted, fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Save your results</p>
          {emailSent ? (
            <p style={{ color: C.activeText, fontSize: 14 }}>✓ Results sent — check your inbox.</p>
          ) : (
            <form onSubmit={handleEmailResults} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={emailVal}
                onChange={e => setEmailVal(e.target.value)}
                style={{
                  flex: 1, minWidth: 200, padding: '10px 15px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${C.goldFaint}`, borderRadius: 6,
                  fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={emailSending || !emailVal}
                style={{
                  padding: '10px 20px', borderRadius: 6, fontWeight: 700, fontSize: 13,
                  backgroundColor: emailVal ? C.gold : 'rgba(216,171,105,0.25)',
                  color: '#0F1B1F', border: 'none',
                  cursor: emailVal && !emailSending ? 'pointer' : 'default',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {emailSending ? 'Sending...' : 'Email me results'}
              </button>
            </form>
          )}
        </div>

        {/* Methodology note */}
        <div style={{ padding: '18px 22px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 8, border: `1px solid ${C.goldFaint}`, marginBottom: 32 }}>
          <p style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.65, margin: 0 }}>
            Match scores are weighted by your stated issue priorities. Source badges show the evidence basis for each candidate position — hover for details. Every question was bias-audited before reaching you.{' '}
            <a href="/methodology" style={{ color: C.gold, textDecoration: 'none', fontWeight: 600 }}>Full methodology →</a>
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onRetake}
            style={{ backgroundColor: C.bgCard, color: C.textMuted, padding: '12px 20px', borderRadius: 6, fontWeight: 600, fontSize: 13, border: `1px solid ${C.goldFaint}`, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Check another race
          </button>
          <button
            onClick={handleCopyShare}
            style={{ backgroundColor: copied ? C.active : C.gold, color: copied ? C.activeText : '#0F1B1F', padding: '12px 20px', borderRadius: 6, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
          >
            {copied ? '✓ Copied!' : '⇧ Share my match'}
          </button>
          {sessionId && (
            <a
              href={`/results/${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: C.textMuted, padding: '12px 20px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: `1px solid ${C.goldFaint}` }}
            >
              Permalink →
            </a>
          )}
          <a href="/support" style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: C.textMuted, padding: '12px 20px', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: `1px solid ${C.goldFaint}` }}>
            Support the project
          </a>
        </div>

      </div>
    </div>
  )
}

// ─── MAIN PAGE ORCHESTRATOR ───────────────────────────────────────────────────
// ─── WELCOME (orientation before the quiz) ───────────────────────────────────
function WelcomeScreen({ race, questionCount, onBegin }) {
  const points = [
    `You are about to answer ${questionCount} questions drawn from what the candidates in this race have said and done.`,
    'Every question was reviewed by three AI models for biased language before it reached you. Questions that failed that review were rewritten until they passed.',
    'You can mark any question as very important to you. Those questions count more in your score.',
    'One optional question comes first: who would you vote for today? Your answer stays private, and it comes back at the end alongside your results. You can skip it.',
  ]
  return (
    <section style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 620, width: '100%' }}>
        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
          {race.label}
        </p>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 300, lineHeight: 1.3, marginBottom: 28 }}>
          Here is how this works.
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 36 }}>
          {points.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ color: C.gold, fontSize: 13, fontWeight: 700, marginTop: 2, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
              <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.7, margin: 0 }}>{p}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onBegin}
          style={{ backgroundColor: C.gold, color: C.bg, padding: '15px 40px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Ready when you are →
        </button>
      </div>
    </section>
  )
}

// ─── PRE-QUIZ STATED PREFERENCE ──────────────────────────────────────────────
function PreVoteQuestion({ candidates, sessionId, onDone }) {
  const [otherMode, setOtherMode] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [saving, setSaving] = useState(false)

  const record = async (payload, resultForReveal) => {
    setSaving(true)
    // Best effort — the quiz continues even if this write fails
    try {
      await fetch('/api/quiz-session/pre-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...payload }),
      })
    } catch {}
    onDone(resultForReveal)
  }

  return (
    <section style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 620, width: '100%' }}>
        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
          Before you start · Optional
        </p>
        <h1 style={{ color: C.text, fontSize: 26, fontWeight: 300, lineHeight: 1.35, marginBottom: 10 }}>
          If the election were tomorrow, who would you vote for?
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.65, marginBottom: 28 }}>
          Your answer stays private. It comes back at the end, next to what your answers actually show.
        </p>

        {!otherMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {candidates.map(c => (
              <button
                key={c.id}
                disabled={saving}
                onClick={() => record({ candidateId: c.id }, { candidateId: c.id, name: c.name })}
                style={{ textAlign: 'left', padding: '15px 18px', backgroundColor: C.bgCard, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: C.text, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {c.name}
              </button>
            ))}
            <button
              disabled={saving}
              onClick={() => setOtherMode(true)}
              style={{ textAlign: 'left', padding: '15px 18px', backgroundColor: C.bgCard, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: C.textMuted, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Someone else
            </button>
          </div>
        )}

        {otherMode && (
          <div style={{ marginBottom: 24 }}>
            <input
              autoFocus
              value={otherText}
              onChange={e => setOtherText(e.target.value)}
              placeholder="Type a name"
              style={{ width: '100%', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.08)', border: `1px solid ${C.goldDim}`, borderRadius: 6, fontSize: 15, color: 'white', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <button
              disabled={saving || !otherText.trim()}
              onClick={() => record({ rawText: otherText.trim() }, { rawText: otherText.trim() })}
              style={{ backgroundColor: C.gold, color: C.bg, padding: '13px 28px', borderRadius: 6, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: otherText.trim() ? 1 : 0.4, marginRight: 12 }}
            >
              That&apos;s my answer
            </button>
            <button
              disabled={saving}
              onClick={() => setOtherMode(false)}
              style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Back to the list
            </button>
          </div>
        )}

        <button
          disabled={saving}
          onClick={() => record({}, null)}
          style={{ background: 'none', border: 'none', color: C.textFaint, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Skip this question
        </button>
      </div>
    </section>
  )
}

// ─── BALLOT MEASURE QUESTIONS (after the candidate quiz) ────────────────────
// One bias-audited question per statewide measure. Optional as a block —
// a single skip finishes the quiz. Answers save best-effort; results
// still render if the write fails.
function MeasureQuestions({ stateCode, sessionId, onDone }) {
  const [measures, setMeasures] = useState(null) // null = loading
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})     // measureId -> 1-5

  useEffect(() => {
    fetch(`/api/measures?state=${stateCode}`)
      .then(r => r.json())
      .then(data => {
        const ready = (data.measures || []).filter(m => m.auditStatus === 'APPROVED' && m.questionText)
        setMeasures(ready)
      })
      .catch(() => setMeasures([]))
  }, [stateCode])

  // Nothing to ask — pass straight through to results
  useEffect(() => {
    if (measures && measures.length === 0) onDone([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measures])

  if (!measures) {
    return (
      <section style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.textMuted, fontSize: 14 }}>Loading your ballot measures…</p>
      </section>
    )
  }
  if (measures.length === 0) return null

  const measure = measures[step]

  const finish = async (finalAnswers) => {
    const list = Object.entries(finalAnswers).map(([measureId, answerValue]) => ({ measureId, answerValue }))
    if (list.length) {
      try {
        await fetch('/api/quiz-session/measures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, answers: list }),
        })
      } catch {}
    }
    onDone(measures.filter(m => finalAnswers[m.id]).map(m => ({ ...m, answerValue: finalAnswers[m.id] })))
  }

  const answer = (value) => {
    const next = { ...answers, [measure.id]: value }
    setAnswers(next)
    if (step < measures.length - 1) setStep(step + 1)
    else finish(next)
  }

  return (
    <section style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 640, width: '100%' }}>
        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
          Ballot Measures · {step + 1} of {measures.length}
        </p>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>{measure.title}</p>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 300, lineHeight: 1.45, marginBottom: 28 }}>
          {measure.questionText}
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {[5, 4, 3, 2, 1].map(v => (
            <button
              key={v}
              onClick={() => answer(v)}
              style={{ textAlign: 'left', padding: '14px 18px', backgroundColor: C.bgCard, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: C.text, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {ANSWER_LABELS[v]}
            </button>
          ))}
        </div>
        <button
          onClick={() => finish(answers)}
          style={{ background: 'none', border: 'none', color: C.textFaint, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Skip the rest and see my results
        </button>
      </div>
    </section>
  )
}

// Leaning label for a 1-5 answer against a yes/no measure question.
function measureLeaning(v) {
  if (v >= 4) return { label: 'Your answer leans Yes', color: '#5ECFA6' }
  if (v <= 2) return { label: 'Your answer leans No', color: '#E57373' }
  return { label: 'No clear lean', color: 'rgba(245,240,232,0.5)' }
}

function MeasureLeanings({ measureAnswers }) {
  if (!measureAnswers?.length) return null
  return (
    <div style={{ marginTop: 48 }}>
      <p style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
        Your Ballot Measures
      </p>
      <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
        A leaning reflects your answer to one audited question per measure. Read the full text before you vote.
      </p>
      {measureAnswers.map(m => {
        const lean = measureLeaning(m.answerValue)
        return (
          <div key={m.id} style={{ backgroundColor: C.bgCard, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '16px 20px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{m.title}</p>
              <p style={{ color: lean.color, fontSize: 13, fontWeight: 700, margin: 0 }}>{lean.label}</p>
            </div>
            {m.yesPosition && (
              <p style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.6, margin: '0 0 8px' }}>{m.yesPosition}</p>
            )}
            {m.sourceUrl && (
              <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.gold, fontSize: 12, textDecoration: 'none' }}>
                Full text and analysis →
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AlignPage() {
  // stage: 'entry' | 'races' | 'welcome' | 'prevote' | 'quiz' | 'measures' | 'results'
  const [stage, setStage] = useState('entry')
  const [selectedState, setSelectedState] = useState(null)   // {code, name}
  const [selectedRace, setSelectedRace] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [candidates, setCandidates] = useState([])
  const [preVote, setPreVote] = useState(null)               // {candidateId?, name?, rawText?} | null
  const [measureAnswers, setMeasureAnswers] = useState([])
  const [results, setResults] = useState(null)
  const [sessionError, setSessionError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleStateSelected = (code, name, district = null) => {
    setSelectedState({ code, name, district })
    setStage('races')
  }

  const handleRaceSelect = async (race) => {
    setLoading(true)
    setSessionError(null)
    try {
      const res = await fetch('/api/quiz-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceId: race.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start quiz')
      setSelectedRace({ ...(race.label ? race : { id: race.id, label: data.raceLabel }), state: data.raceState })
      setSessionId(data.sessionId)
      setQuestions(data.questions)
      setCandidates(data.candidates ?? [])
      setStage('welcome')
    } catch (err) {
      setSessionError(err.message)
    }
    setLoading(false)
  }

  // Deep link: /align?race=<raceId> jumps straight to that race's welcome screen
  useEffect(() => {
    const raceId = new URLSearchParams(window.location.search).get('race')
    if (raceId) handleRaceSelect({ id: raceId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleComplete = (data) => {
    setResults(data)
    setStage('measures') // MeasureQuestions passes through when none exist
  }

  const handleRetake = () => {
    setStage('entry')
    setSelectedState(null)
    setSelectedRace(null)
    setResults(null)
    setSessionError(null)
  }

  return (
    <>
      {loading && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,27,31,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.gold}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: C.gold, fontSize: 14, fontWeight: 700 }}>Loading your quiz...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}
      {sessionError && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1A3A42', border: `1px solid ${C.goldDim}`, borderRadius: 8, padding: '12px 20px', color: C.text, fontSize: 14, zIndex: 100, maxWidth: 360 }}>
          {sessionError}
          <button onClick={() => setSessionError(null)} style={{ marginLeft: 12, background: 'none', border: 'none', color: C.gold, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>dismiss</button>
        </div>
      )}

      {stage === 'entry' && (
        <StateSelector onStateSelected={handleStateSelected} />
      )}
      {stage === 'races' && selectedState && (
        <RaceSelector
          stateCode={selectedState.code}
          stateName={selectedState.name}
          district={selectedState.district}
          onSelect={handleRaceSelect}
          onBack={() => setStage('entry')}
        />
      )}
      {stage === 'welcome' && selectedRace && (
        <WelcomeScreen
          race={selectedRace}
          questionCount={questions.length}
          onBegin={() => setStage(candidates.length > 0 ? 'prevote' : 'quiz')}
        />
      )}
      {stage === 'prevote' && (
        <PreVoteQuestion
          candidates={candidates}
          sessionId={sessionId}
          onDone={(pv) => { setPreVote(pv); setStage('quiz') }}
        />
      )}
      {stage === 'quiz' && selectedRace && (
        <QuizQuestions
          race={selectedRace}
          sessionId={sessionId}
          questions={questions}
          onComplete={handleComplete}
        />
      )}
      {stage === 'measures' && selectedRace && (
        <MeasureQuestions
          stateCode={selectedRace.state ?? selectedState?.code ?? ''}
          sessionId={sessionId}
          onDone={(ma) => { setMeasureAnswers(ma); setStage('results') }}
        />
      )}
      {stage === 'results' && results && (
        <Results
          scores={results.scores}
          topIssues={results.topIssues}
          race={selectedRace}
          sessionId={sessionId}
          preVote={preVote}
          measureAnswers={measureAnswers}
          onRetake={handleRetake}
        />
      )}
    </>
  )
}
