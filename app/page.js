/**
 * Copyright \u00A9 2025 The Founded Project LLC
 * All rights reserved. Proprietary and confidential.
 *
 * This source code is the exclusive property of The Founded Project LLC
 * and may not be copied, modified, distributed, or used without explicit
 * written permission from The Founded Project LLC.
 *
 * GroundedVote\u2122 \u2014 A Civic Alignment Engine
 * https://groundedvote.com
 */

'use client'

import { useState, useEffect, useRef } from 'react'

function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

function Reveal({ children, delay = 0 }) {
  const [ref, visible] = useReveal()
  return <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: `all 0.75s ease ${delay}ms` }}>{children}</div>
}

// Small American flag SVG \u2014 civic symbol, not partisan
function USFlag({ size = 22 }) {
  const h = Math.round(size * (15 / 22))
  const stripe = h / 13
  const cantonH = stripe * 7
  const cantonW = size * 0.4
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: 0.82, display: 'block' }}>
      <rect width={size} height={h} fill="#B22234"/>
      {[1, 3, 5, 7, 9, 11].map(n => (
        <rect key={n} y={n * stripe} width={size} height={stripe} fill="#FFFFFF"/>
      ))}
      <rect width={cantonW} height={cantonH} fill="#3C3B6E"/>
    </svg>
  )
}

// Maps issueKey \u2192 display label for results page
const ISSUE_LABELS = {
  economy: 'Economic Policy',
  healthcare: 'Healthcare',
  environment: 'Environment & Climate',
  immigration: 'Immigration',
  guns: 'Gun Policy',
  taxes: 'Taxes & Federal Spending',
  foreign_policy: 'Foreign Policy & Defense',
  democracy: 'Voting Rights & Democracy',
}

const CIVIC_QUIZ = [
  {
    q: 'In the last election you voted in, how confident were you that your vote matched what you actually believe?',
    key: 'voting_confidence',
    options: [
      { label: 'Very confident \u2014 I researched candidates and positions thoroughly.', value: 'confident' },
      { label: 'Somewhat confident \u2014 I had a general sense but not much depth.', value: 'partial' },
      { label: 'Not confident \u2014 I voted based on party or general feeling.', value: 'low' },
      { label: 'I did not vote. I did not feel like I had enough information.', value: 'disengaged' },
    ],
  },
  {
    q: 'Which issue area matters most to you heading into the 2026 elections?',
    key: 'primary_issue',
    note: 'Your top two choices will shape how your results are scored.',
    options: [
      { label: 'Economic policy \u2014 wages, jobs, cost of living, trade.', value: 'economy' },
      { label: 'Healthcare \u2014 coverage, drug prices, Medicare, Medicaid.', value: 'healthcare' },
      { label: 'Environment and climate \u2014 emissions, energy policy, public lands.', value: 'environment' },
      { label: 'Immigration \u2014 pathways to citizenship, enforcement, border policy.', value: 'immigration' },
    ],
  },
  {
    q: 'Which of these is your second priority?',
    key: 'secondary_issue',
    note: 'These two issues will count extra in your final match score.',
    options: [
      { label: 'Gun policy \u2014 background checks, firearm regulation, public safety.', value: 'guns' },
      { label: 'Taxes and federal spending \u2014 rates, deficits, size of government.', value: 'taxes' },
      { label: 'Foreign policy \u2014 defense budget, military commitments, foreign aid.', value: 'foreign_policy' },
      { label: 'Voting rights and democratic process \u2014 access, elections, accountability.', value: 'democracy' },
    ],
  },
  {
    q: 'When you encounter a political issue you have not thought about before, what is your default move?',
    key: 'info_processing',
    options: [
      { label: 'I research it independently before forming any opinion.', value: 'research' },
      { label: 'I listen to trusted people in my community or network first.', value: 'community' },
      { label: 'I default to my general political leanings and move on.', value: 'partisan' },
      { label: 'I avoid it \u2014 most political content feels too loaded to engage with honestly.', value: 'avoidance' },
    ],
  },
  {
    q: 'When you evaluate a candidate, what do you trust most?',
    key: 'trust_signal',
    options: [
      { label: 'Their actual voting record \u2014 what they did when it counted, not what they say now.', value: 'record' },
      { label: 'The organizations and donors who fund their campaigns.', value: 'funding' },
      { label: 'Their stated platform and policy positions.', value: 'platform' },
      { label: 'How they perform when questioned directly under pressure.', value: 'performance' },
    ],
  },
  {
    q: 'What would it mean for your life if you voted and knew \u2014 with confidence \u2014 that your vote matched what you actually believe?',
    key: 'alignment_meaning',
    options: [
      { label: 'It would make voting feel like a deliberate act instead of a performance.', value: 'meaningful' },
      { label: 'It would give me confidence I have not had at the ballot box before.', value: 'confidence' },
      { label: 'It would break the cycle of voting out of fear instead of belief.', value: 'cycle' },
      { label: 'Honestly \u2014 it would change how I feel about whether democracy can work.', value: 'democracy' },
    ],
  },
]

const CIVIC_PROFILES = {
  confident: {
    title: 'You already do the research. GroundedVote makes it faster, cleaner, and easier to verify.',
    desc: 'You put in the work. But even careful voters can be shaped by how information is framed \u2014 or by what gets left out. The bias-reviewed questions give your process a more reliable foundation, and may surface candidates you have not yet considered.',
    next: 'Join the notification list to be first in when we launch.',
  },
  partial: {
    title: "You know what you care about. You just haven't had a tool that connects it to real candidate records.",
    desc: "That is not a personal failure. It is a failure of available tools. GroundedVote was built for people with clear values who want a fair, unbiased way to see which candidates actually match what they believe.",
    next: 'Join the list. You are exactly who this was built for.',
  },
  low: {
    title: 'You are voting your party, not your beliefs. You probably already sense this.',
    desc: 'The information system is designed to make this the easiest path. When every channel is built to keep you in your lane, making your own call is hard. GroundedVote cuts through the noise and shows you which candidates match what you actually think \u2014 not what your party told you to think.',
    next: 'Join the list. The alternative exists now.',
  },
  disengaged: {
    title: 'You did not disengage. The tools were not there for you.',
    desc: 'This is not apathy. You showed up wanting to make a real decision and found nothing useful waiting for you. GroundedVote was built first for people in this exact spot \u2014 clear enough for someone who has never closely followed an election, and useful enough that most people want to pass it on.',
    next: 'Join the list. This was built for you first.',
  },
}

function deriveProfile(answers) {
  const scores = { confident: 0, partial: 0, low: 0, disengaged: 0 }

  // Q1 \u2014 voting confidence (weight 4 \u2014 primary signal)
  const q1 = answers[0]?.value
  if (q1 === 'confident') scores.confident += 4
  else if (q1 === 'partial') scores.partial += 4
  else if (q1 === 'low') scores.low += 4
  else if (q1 === 'disengaged') scores.disengaged += 4

  // Q2 + Q3 \u2014 issue priorities \u2014 extracted separately, not scored for profile

  // Q4 \u2014 info processing (weight 2)
  const q4 = answers[3]?.value
  if (q4 === 'research') scores.confident += 2
  else if (q4 === 'community') scores.partial += 2
  else if (q4 === 'partisan') scores.low += 2
  else if (q4 === 'avoidance') scores.disengaged += 2

  // Q5 \u2014 trust signal (weight 1)
  const q5 = answers[4]?.value
  if (q5 === 'record') scores.confident += 1
  else if (q5 === 'funding') scores.partial += 1
  else if (q5 === 'platform') scores.partial += 1
  else if (q5 === 'performance') scores.low += 1

  // Q6 \u2014 alignment meaning (weight 1)
  const q6 = answers[5]?.value
  if (q6 === 'meaningful') scores.partial += 1
  else if (q6 === 'confidence') scores.low += 1
  else if (q6 === 'cycle') scores.low += 1
  else if (q6 === 'democracy') scores.disengaged += 1

  const profileKey = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]

  // Extract issue priorities from Q2 and Q3
  const issuePriorities = [
    answers[1]?.value,
    answers[2]?.value,
  ].filter(Boolean)

  return { profileKey, issuePriorities }
}

function NotifyForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stateCode, setStateCode] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get('state')
    if (s) setStateCode(s.toUpperCase())
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          answers: [],
          profile: { title: 'Notification signup', desc: '', next: '' },
          notifyState: stateCode ?? null,
        }),
      })
    } catch {}
    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ padding: '20px 0' }}>
        <p style={{ color: '#E8A820', fontWeight: 700, fontSize: 15 }}>You are on the list.</p>
        <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 13, marginTop: 6 }}>
          {stateCode
            ? `We will email you as soon as ${stateCode} races go live on GroundedVote.`
            : 'We will notify you when the full platform is live.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {stateCode && (
        <div style={{ backgroundColor: 'rgba(94,207,166,0.12)', border: '1px solid rgba(94,207,166,0.25)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#5ECFA6', fontSize: 18 }}>o</span>
          <p style={{ color: '#5ECFA6', fontSize: 13, fontWeight: 600, margin: 0 }}>
            Notifying you when <strong>{stateCode}</strong> races go live
          </p>
        </div>
      )}
      <input
        name="email"
        required
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        style={{ padding: '14px 18px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(232,168,32,0.3)', borderRadius: 6, fontSize: 15, color: 'white', outline: 'none' }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{ backgroundColor: '#E8A820', color: '#0C1A2E', padding: '14px', borderRadius: 6, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
      >
        {loading ? 'Saving...' : stateCode ? `Notify me when ${stateCode} is live` : 'Notify me at launch'}
      </button>
    </form>
  )
}

function CivicQuiz() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [issuePriorities, setIssuePriorities] = useState([])
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => { setTimeout(() => setHeroVisible(true), 100) }, [])

  const question = CIVIC_QUIZ[step - 1]

  const handleNext = () => {
    if (!selected) return
    const newAnswers = [...answers, { q: question.q, value: selected, a: question.options.find(o => o.value === selected).label }]
    setAnswers(newAnswers)
    setSelected(null)
    if (step < CIVIC_QUIZ.length) {
      setStep(step + 1)
    } else {
      const { profileKey, issuePriorities: derived } = deriveProfile(newAnswers)
      setProfile(CIVIC_PROFILES[profileKey] || CIVIC_PROFILES.partial)
      setIssuePriorities(derived)
      setStep(CIVIC_QUIZ.length + 1)
    }
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answers, profile, issuePriorities }),
      })
    } catch {}
    setLoading(false)
    setStep(CIVIC_QUIZ.length + 2)
  }

  // HERO STATE
  if (step === 0) return (
    <div id="quiz" style={{ minHeight: '100vh', backgroundColor: '#0C1A2E', backgroundImage: 'url(/hero-community.png)', backgroundSize: 'cover', backgroundPosition: 'center 75%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(12,26,46,0.45), rgba(12,26,46,0.25)), radial-gradient(ellipse at 30% 50%, rgba(232,168,32,0.10), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 80, alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div>
          {/* Brand label with American flag \u2014 civic engagement is patriotic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s 200ms' }}>
            <USFlag size={22} />
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0 }}>GroundedVote</p>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 300, color: '#F5F0E8', lineHeight: 1.1, letterSpacing: '-0.025em', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(100%)', transition: 'all 0.9s ease 400ms' }}>
              Most Americans vote
            </div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 300, color: '#E8A820', lineHeight: 1.1, letterSpacing: '-0.025em', opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(100%)', transition: 'all 0.9s ease 560ms' }}>
              on fear.
            </div>
          </div>
          <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 17, lineHeight: 1.75, maxWidth: 440, marginTop: 32, opacity: heroVisible ? 1 : 0, transition: 'opacity 1.2s ease 900ms' }}>
            We take real candidate positions and turn them into clear, unbiased questions. You answer based on what you actually think. Then you see which candidates line up with your beliefs &mdash; not your party label.
          </p>
          <p style={{ color: 'rgba(245,240,232,0.35)', fontSize: 14, lineHeight: 1.7, maxWidth: 400, marginTop: 12, opacity: heroVisible ? 1 : 0, transition: 'opacity 1.2s ease 1.1s' }}>
            Every question is reviewed for fairness before you see it. No spin. No hidden agenda.
          </p>
        </div>

        <div style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 700ms' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,168,32,0.2)', borderRadius: 12, padding: 40 }}>
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Take the Quiz First</p>
            <h3 style={{ color: '#F5F0E8', fontSize: 22, fontWeight: 300, lineHeight: 1.3, marginBottom: 12 }}>Six questions about how you currently vote.</h3>
            <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 14, lineHeight: 1.65, marginBottom: 32 }}>
              Two questions ask what issues matter most to you. We use your answers to make your results more accurate. No wrong answers.
            </p>
            <button onClick={() => setStep(1)} style={{ backgroundColor: '#E8A820', color: '#0C1A2E', padding: '16px 40px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', width: '100%' }}>
              Start the quiz &rarr;
            </button>
            <p style={{ color: 'rgba(245,240,232,0.25)', fontSize: 11, textAlign: 'center', marginTop: 12 }}>Takes about 3 minutes. Results sent to your email.</p>
          </div>
        </div>
      </div>
    </div>
  )

  // QUIZ QUESTIONS
  if (step >= 1 && step <= CIVIC_QUIZ.length) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0C1A2E', display: 'flex', alignItems: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 48 }}>
          {CIVIC_QUIZ.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? '#E8A820' : 'rgba(232,168,32,0.15)', transition: 'background-color 0.4s' }} />
          ))}
        </div>
        <p style={{ color: 'rgba(232,168,32,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Question {step} of {CIVIC_QUIZ.length}</p>
        {/* Issue salience note \u2014 shown on Q2 and Q3 */}
        {question.note && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', backgroundColor: 'rgba(232,168,32,0.08)', borderRadius: 6, border: '1px solid rgba(232,168,32,0.2)' }}>
            <span style={{ color: '#E8A820', fontSize: 16 }}>&#9678;</span>
            <p style={{ color: 'rgba(232,168,32,0.85)', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', margin: 0 }}>{question.note}</p>
          </div>
        )}
        <h2 style={{ color: '#F5F0E8', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 300, lineHeight: 1.45, marginBottom: 40, letterSpacing: '-0.01em' }}>{question.q}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
          {question.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              style={{
                textAlign: 'left', padding: '18px 22px', borderRadius: 8, fontSize: 15, lineHeight: 1.55,
                cursor: 'pointer', transition: 'all 0.15s',
                backgroundColor: selected === opt.value ? '#E8A820' : 'rgba(255,255,255,0.05)',
                color: selected === opt.value ? '#0C1A2E' : '#F5F0E8',
                border: `1.5px solid ${selected === opt.value ? '#E8A820' : 'rgba(232,168,32,0.15)'}`,
                fontWeight: selected === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 && (
            <button onClick={() => { setStep(step - 1); setSelected(null) }} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.4)', fontSize: 13, cursor: 'pointer', padding: 0 }}>&larr; Back</button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={handleNext}
              disabled={!selected}
              style={{ backgroundColor: selected ? '#E8A820' : 'rgba(232,168,32,0.2)', color: '#0C1A2E', padding: '14px 32px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: selected ? 'pointer' : 'default', opacity: selected ? 1 : 0.5, transition: 'all 0.15s' }}
            >
              {step === CIVIC_QUIZ.length ? 'See my civic profile \u2192' : 'Continue \u2192'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // EMAIL CAPTURE
  if (step === CIVIC_QUIZ.length + 1) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0C1A2E', display: 'flex', alignItems: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>One more step</p>
        <h2 style={{ color: '#F5F0E8', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>Where should we send your results?</h2>
        <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 16, lineHeight: 1.65, marginBottom: 36 }}>We will email your profile along with a link to the full quiz when it launches. Takes about 3 minutes total.</p>
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            required
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ padding: '18px 20px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(232,168,32,0.25)', borderRadius: 6, fontSize: 16, color: 'white', outline: 'none' }}
          />
          <button type="submit" disabled={loading} style={{ backgroundColor: '#E8A820', color: '#0C1A2E', padding: '18px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Sending...' : 'Send my results'}
          </button>
        </form>
        <p style={{ color: 'rgba(245,240,232,0.25)', fontSize: 12, marginTop: 12 }}>No spam. Unsubscribe anytime. Your answers are never sold or shared.</p>
      </div>
    </div>
  )

  // RESULT
  if (step === CIVIC_QUIZ.length + 2 && profile) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0C1A2E', display: 'flex', alignItems: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Your Civic Profile</p>
        <h2 style={{ color: '#F5F0E8', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 500, lineHeight: 1.3, marginBottom: 24 }}>{profile.title}</h2>
        <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: 17, lineHeight: 1.75, marginBottom: 20, maxWidth: 600 }}>{profile.desc}</p>
        <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 15, lineHeight: 1.7, marginBottom: 32, borderLeft: '2px solid rgba(232,168,32,0.4)', paddingLeft: 16 }}>{profile.next}</p>

        {/* Issue priority summary \u2014 feeds into /align weighting */}
        {issuePriorities.length > 0 && (
          <div style={{ marginBottom: 40, padding: '20px 24px', backgroundColor: 'rgba(232,168,32,0.06)', borderRadius: 8, border: '1px solid rgba(232,168,32,0.2)' }}>
            <p style={{ color: 'rgba(232,168,32,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>Your Issue Priorities</p>
            <p style={{ color: '#F5F0E8', fontSize: 16, fontWeight: 500, marginBottom: 6 }}>
              {issuePriorities.map(k => ISSUE_LABELS[k] || k).join(' \u00B7 ')}
            </p>
            <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 13, lineHeight: 1.6 }}>
              When you take the full alignment quiz at <a href="/align" style={{ color: '#E8A820', textDecoration: 'none' }}>/align</a>, questions in these areas will carry extra weight in your match score &mdash; so your results reflect what you actually care about most.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="/align" style={{ backgroundColor: '#E8A820', color: '#0C1A2E', padding: '14px 32px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Take the alignment quiz &rarr;</a>
          <a href="/methodology" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.7)', padding: '14px 32px', borderRadius: 6, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: '1px solid rgba(232,168,32,0.2)' }}>Read the methodology</a>
        </div>
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(232,168,32,0.15)' }}>
          <p style={{ color: 'rgba(245,240,232,0.35)', fontSize: 13 }}>Your results have been sent to your email. Scroll down to learn more about how GroundedVote works.</p>
        </div>
      </div>
    </div>
  )

  return null
}

export default function Home() {
  const forces = [
    { name: 'Identity Signaling', desc: 'Voting has become about showing what side you are on. People end up voting against who they dislike instead of for what they actually believe.' },
    { name: 'Fear Activation', desc: 'When people feel scared, they stop thinking clearly. A lot of political ads and news coverage are built to do exactly that.' },
    { name: 'Party Loyalty', desc: 'For most voters, the party name is all they need. Nobody reads the policies. The party tells you what to think before you ever look it up.' },
    { name: 'Media Distortion', desc: 'The stories that get attention online are rarely about the things that actually affect your life. Outrage gets clicks. Facts about policy do not.' },
  ]

  return (
    <>
      <CivicQuiz />

      <section style={{ backgroundColor: '#F5F0E8', padding: '120px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>The Problem</p>
            <h2 style={{ color: '#0C1A2E', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 12 }}>
              Low voter turnout is not<br />a motivation problem.
            </h2>
            <h2 style={{ color: '#0C1A2E', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 48 }}>
              It is a problem with the <em>information people are given.</em>
            </h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, backgroundColor: 'rgba(12,26,46,0.08)' }}>
            {forces.map((force, i) => (
              <Reveal key={force.name} delay={i * 80}>
                <div style={{ backgroundColor: '#F5F0E8', padding: '36px 28px' }}>
                  <p style={{ color: '#0C1A2E', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{force.name}</p>
                  <p style={{ color: 'rgba(12,26,46,0.6)', fontSize: 14, lineHeight: 1.7 }}>{force.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={320}>
            <div style={{ backgroundColor: '#0C1A2E', padding: '40px 40px', borderRadius: 8, marginTop: 2 }}>
              <p style={{ color: '#F5F0E8', fontSize: 18, fontWeight: 300, lineHeight: 1.6, maxWidth: 680 }}>
                &ldquo;Voters are not confused because they are not smart enough. They are confused because the system was built to keep them that way.&rdquo;
              </p>
              <p style={{ color: 'rgba(232,168,32,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 16 }}>GroundedVote Founding Framework &middot; 2026</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ backgroundColor: '#0C1A2E', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 40, textAlign: 'center' }}>How It Works</p>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative' }}>
              {[
                { num: '01', title: 'Candidate Data', sub: 'Official government records \u00B7 Voting history \u00B7 Verified campaign platforms \u00B7 Public statements', icon: '\u25C8' },
                { num: '02', title: 'Bias Review', sub: 'Three AI models check each question \u00B7 Loaded language removed \u00B7 Rewritten if it does not pass', icon: '\u25CE' },
                { num: '03', title: 'Civic Mirror', sub: 'Short quiz \u00B7 Issues you care about count more \u00B7 See who actually matches what you believe', icon: '\u25C9' },
              ].map((phase, i) => (
                <div key={phase.num} style={{ padding: '40px 28px', backgroundColor: i === 1 ? 'rgba(232,168,32,0.08)' : 'transparent', borderLeft: i > 0 ? '1px solid rgba(232,168,32,0.15)' : 'none', textAlign: 'center', position: 'relative' }}>
                  {i > 0 && (
                    <div style={{ position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', color: '#E8A820', fontSize: 20, fontWeight: 300 }}>&rarr;</div>
                  )}
                  <p style={{ color: 'rgba(232,168,32,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 16 }}>{phase.num}</p>
                  <p style={{ color: '#E8A820', fontSize: 28, marginBottom: 16 }}>{phase.icon}</p>
                  <p style={{ color: '#F5F0E8', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{phase.title}</p>
                  <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 12, lineHeight: 1.65 }}>{phase.sub}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <p style={{ color: 'rgba(245,240,232,0.35)', fontSize: 13, lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
                Every question is publicly reviewed. Every bias score is on record. You can read the full methodology before you answer anything.
              </p>
              <a href="/methodology" style={{ display: 'inline-block', marginTop: 20, color: '#E8A820', fontSize: 13, fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(232,168,32,0.4)', paddingBottom: 2 }}>Read the full methodology &rarr;</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ backgroundColor: '#E8A820', padding: '60px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#0C1A2E', fontSize: 'clamp(20px, 3.5vw, 34px)', fontWeight: 300, lineHeight: 1.4, marginBottom: 10 }}>
            Democracy works when the information does.
          </p>
          <p style={{ color: 'rgba(12,26,46,0.55)', fontSize: 15, fontStyle: 'italic' }}>
            Knowing who you are actually voting for is one of the most American things you can do.
          </p>
        </div>
      </section>

      <section style={{ backgroundColor: '#0C1A2E', padding: '120px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>The Method</p>
            <h2 style={{ color: '#F5F0E8', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 64 }}>
              Three phases.<br />One civic mirror.
            </h2>
          </Reveal>

          {[
            { num: '01', phase: 'Candidate Data Collection', desc: 'We pull from official government records, voting histories, and verified campaign platforms. The more official the source, the more weight it carries. No guessing from press releases.' },
            { num: '02', phase: 'Bias Review', desc: 'Three AI models review every question for one-sided language or unbalanced framing. Any question that does not pass gets rewritten. The full review log is available to the public.' },
            { num: '03', phase: 'Civic Alignment', desc: 'You answer a short quiz about real policy issues. Questions in the areas you told us matter most to you count for more. At the end, you see which candidates actually line up with what you believe \u2014 not what your party told you to believe.' },
          ].map((step, i) => (
            <Reveal key={step.num} delay={i * 100}>
              <div style={{ borderTop: '1px solid rgba(232,168,32,0.15)', padding: '40px 0', display: 'grid', gridTemplateColumns: '60px 280px 1fr', gap: 32, alignItems: 'start' }}>
                <span style={{ color: 'rgba(232,168,32,0.4)', fontSize: 12, fontWeight: 700, paddingTop: 2 }}>{step.num}</span>
                <p style={{ color: '#F5F0E8', fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>{step.phase}</p>
                <p style={{ color: 'rgba(245,240,232,0.55)', fontSize: 15, lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section style={{ backgroundColor: '#E8A820', padding: '100px 24px' }} id="notify">
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 64, alignItems: 'center' }}>
          <Reveal>
            <p style={{ color: 'rgba(12,26,46,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Built For Them First</p>
            <h2 style={{ color: '#0C1A2E', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 20 }}>
              The people who need this most never had the right tools.
            </h2>
            <p style={{ color: 'rgba(12,26,46,0.7)', fontSize: 16, lineHeight: 1.75 }}>
              First-time voters. People in communities where local news disappeared years ago. People who wanted to vote with confidence but did not know where to start. None of that is their fault.
            </p>
            <p style={{ color: 'rgba(12,26,46,0.7)', fontSize: 16, lineHeight: 1.75, marginTop: 16 }}>
              GroundedVote works even if you have never closely followed an election. You finish in under five minutes. And most people want to pass it on to someone they know.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div style={{ backgroundColor: '#0C1A2E', borderRadius: 12, padding: 40 }}>
              <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Live Now</p>
              <h3 style={{ color: '#F5F0E8', fontSize: 22, fontWeight: 300, marginBottom: 8 }}>The alignment quiz is live for 2026 races.</h3>
              <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>Enter your address at <a href="/align" style={{ color: '#E8A820', textDecoration: 'none' }}>/align</a> to see the races on your ballot. Sign up below and we will tell you when new states and races come online. Then share it with one person who needs it.</p>
              <NotifyForm />
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ backgroundColor: '#F5F0E8', padding: '80px 24px', borderTop: '1px solid rgba(12,26,46,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <p style={{ color: '#0C1A2E', fontSize: 18, fontWeight: 400, marginBottom: 4 }}>Funders, civic partners, and academic reviewers.</p>
            <p style={{ color: 'rgba(12,26,46,0.5)', fontSize: 14 }}>The methodology white paper is available for review.</p>
          </div>
          <a href="/contact" style={{ backgroundColor: '#0C1A2E', color: '#E8A820', padding: '14px 32px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Contact the team</a>
        </div>
      </section>
    </>
  )
}
