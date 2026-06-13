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

const CIVIC_QUIZ = [
  {
    q: 'In the last election you voted in, how confident were you that your vote matched what you actually believe?',
    options: [
      { label: 'Very confident — I researched candidates and positions thoroughly.', value: 'confident' },
      { label: 'Somewhat confident — I had a general sense but not much depth.', value: 'partial' },
      { label: 'Not confident — I voted based on party or general feeling.', value: 'low' },
      { label: 'I did not vote. I did not feel like I had enough information.', value: 'disengaged' },
    ],
  },
  {
    q: 'When you hear about a political issue in the news, what shapes your opinion most?',
    options: [
      { label: 'My own research into the policy and its evidence base.', value: 'research' },
      { label: 'What my party or community generally believes.', value: 'community' },
      { label: 'The emotional reaction it creates in me.', value: 'emotional' },
      { label: 'What trusted people in my network think about it.', value: 'network' },
    ],
  },
  {
    q: 'What would have to be different for you to trust a civic tool enough to use it?',
    options: [
      { label: 'It would have to show me where it got its data.', value: 'transparent' },
      { label: 'It would have to be built by people not affiliated with any party.', value: 'nonpartisan' },
      { label: 'It would have to ask me what I believe — not tell me what to think.', value: 'autonomy' },
      { label: 'Honestly — I would just need to see that it works.', value: 'proof' },
    ],
  },
  {
    q: 'What would it mean for your life if you voted and actually knew — for certain — that your vote matched what you believe?',
    options: [
      { label: 'It would make voting feel meaningful instead of performative.', value: 'meaningful' },
      { label: 'It would give me confidence I do not currently have at the ballot box.', value: 'confidence' },
      { label: 'It would break the cycle of voting out of fear instead of belief.', value: 'cycle' },
      { label: 'Honestly — it would change how I feel about democracy.', value: 'democracy' },
    ],
  },
]

const CIVIC_PROFILES = {
  confident: {
    title: 'You are already doing the work. GroundedVote makes it faster and cleaner.',
    desc: 'You research. You think. But even careful voters can be influenced by framing, sourcing, and omission. The bias-audited pipeline gives your existing process a more reliable foundation.',
    next: 'Join the notification list to be first to use it when it launches.',
  },
  partial: {
    title: "You know your values. You just don't have a tool that matches them to policy.",
    desc: 'That is not a failure of effort. That is a failure of available infrastructure. GroundedVote is built specifically for this gap — people with clear values who lack a reliable way to connect them to candidates.',
    next: 'Join the list. You are exactly who this was built for.',
  },
  low: {
    title: 'You are voting your identity, not your beliefs. You already know this.',
    desc: 'The information environment is designed to make this inevitable. When every channel is built to activate tribal response, careful deliberation requires a counter-architecture. That is what GroundedVote builds.',
    next: 'Join the list. The alternative exists now.',
  },
  disengaged: {
    title: 'You did not disengage. You were failed by the information system.',
    desc: 'This is not apathy. You showed up to make a decision and the tools were not there. GroundedVote was built first for people in exactly this position — accessible to someone who has never followed an election closely, built to hold their attention.',
    next: 'Join the list. This was built for you first.',
  },
}

// Weighted profile scoring — uses all 4 answers
function deriveProfile(answers) {
  const scores = { confident: 0, partial: 0, low: 0, disengaged: 0 }

  // Q1 carries most weight (direct confidence signal)
  const q1 = answers[0]?.value
  if (q1 === 'confident') scores.confident += 3
  else if (q1 === 'partial') scores.partial += 3
  else if (q1 === 'low') scores.low += 3
  else if (q1 === 'disengaged') scores.disengaged += 3

  // Q2 — research = confident, community/emotional/network = partial or low
  const q2 = answers[1]?.value
  if (q2 === 'research') scores.confident += 1
  else if (q2 === 'community') scores.low += 1
  else if (q2 === 'emotional') scores.partial += 1
  else if (q2 === 'network') scores.partial += 1

  // Q3 — trust signals
  const q3 = answers[2]?.value
  if (q3 === 'transparent' || q3 === 'nonpartisan') scores.confident += 1
  else if (q3 === 'autonomy') scores.partial += 1
  else if (q3 === 'proof') scores.disengaged += 1

  // Q4 — what alignment would mean
  const q4 = answers[3]?.value
  if (q4 === 'meaningful') scores.partial += 1
  else if (q4 === 'confidence') scores.low += 1
  else if (q4 === 'cycle') scores.low += 1
  else if (q4 === 'democracy') scores.disengaged += 1

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}

function NotifyForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stateCode, setStateCode] = useState(null)

  // Read ?state=XX from URL on mount — set by Coming Soon pages
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
          <span style={{ color: '#5ECFA6', fontSize: 18 }}>📍</span>
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
        style={{ backgroundColor: '#E8A820', color: '#0F1B1F', padding: '14px', borderRadius: 6, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
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
      const profileKey = deriveProfile(newAnswers)
      setProfile(CIVIC_PROFILES[profileKey] || CIVIC_PROFILES.partial)
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
        body: JSON.stringify({ email, answers, profile }),
      })
    } catch {}
    setLoading(false)
    setStep(CIVIC_QUIZ.length + 2)
  }

  // HERO STATE
  if (step === 0) return (
    <div id="quiz" style={{ minHeight: '100vh', backgroundColor: '#0F1B1F', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(232,168,32,0.10), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 80, alignItems: 'center' }}>
        <div>
          <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 32, opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s 200ms' }}>GroundedVote</p>
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
            We generate neutral policy questions from actual candidate positions. You answer honestly. Then you see which candidates match what you already believe.
          </p>
          <p style={{ color: 'rgba(245,240,232,0.35)', fontSize: 14, lineHeight: 1.7, maxWidth: 400, marginTop: 12, opacity: heroVisible ? 1 : 0, transition: 'opacity 1.2s ease 1.1s' }}>
            Every question goes through a bias audit before it reaches you. No loaded language. No political framing.
          </p>
        </div>

        <div style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 700ms' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,168,32,0.2)', borderRadius: 12, padding: 40 }}>
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Before We Build This For You</p>
            <h3 style={{ color: '#F5F0E8', fontSize: 22, fontWeight: 300, lineHeight: 1.3, marginBottom: 12 }}>Four questions about how you currently vote.</h3>
            <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 14, lineHeight: 1.65, marginBottom: 32 }}>
              No wrong answers. This tells us which part of the GroundedVote methodology matters most for your situation — and sends you a personalized civic profile.
            </p>
            <button onClick={() => setStep(1)} style={{ backgroundColor: '#E8A820', color: '#0F1B1F', padding: '16px 40px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', width: '100%' }}>
              Begin the civic mirror →
            </button>
            <p style={{ color: 'rgba(245,240,232,0.25)', fontSize: 11, textAlign: 'center', marginTop: 12 }}>Takes about 2 minutes. Results sent to your email.</p>
          </div>
        </div>
      </div>
    </div>
  )

  // QUIZ QUESTIONS
  if (step >= 1 && step <= CIVIC_QUIZ.length) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F1B1F', display: 'flex', alignItems: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 48 }}>
          {CIVIC_QUIZ.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? '#E8A820' : 'rgba(232,168,32,0.15)', transition: 'background-color 0.4s' }} />
          ))}
        </div>
        <p style={{ color: 'rgba(232,168,32,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Question {step} of {CIVIC_QUIZ.length}</p>
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
                color: selected === opt.value ? '#0F1B1F' : '#F5F0E8',
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
            <button onClick={() => { setStep(step - 1); setSelected(null) }} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.4)', fontSize: 13, cursor: 'pointer', padding: 0 }}>← Back</button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={handleNext}
              disabled={!selected}
              style={{ backgroundColor: selected ? '#E8A820' : 'rgba(232,168,32,0.2)', color: '#0F1B1F', padding: '14px 32px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: selected ? 'pointer' : 'default', opacity: selected ? 1 : 0.5, transition: 'all 0.15s' }}
            >
              {step === CIVIC_QUIZ.length ? 'See my civic profile →' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // EMAIL CAPTURE
  if (step === CIVIC_QUIZ.length + 1) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F1B1F', display: 'flex', alignItems: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Almost there</p>
        <h2 style={{ color: '#F5F0E8', fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>Where should your civic profile go?</h2>
        <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 16, lineHeight: 1.65, marginBottom: 36 }}>Your results, what they tell you about how you currently vote, and what GroundedVote will give you that you do not have now.</p>
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            required
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ padding: '18px 20px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(232,168,32,0.25)', borderRadius: 6, fontSize: 16, color: 'white', outline: 'none' }}
          />
          <button type="submit" disabled={loading} style={{ backgroundColor: '#E8A820', color: '#0F1B1F', padding: '18px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Sending...' : 'Send my civic profile'}
          </button>
        </form>
        <p style={{ color: 'rgba(245,240,232,0.25)', fontSize: 12, marginTop: 12 }}>No spam. Unsubscribe anytime. Your answers are never sold or shared.</p>
      </div>
    </div>
  )

  // RESULT
  if (step === CIVIC_QUIZ.length + 2 && profile) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F1B1F', display: 'flex', alignItems: 'center', padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Your Civic Profile</p>
        <h2 style={{ color: '#F5F0E8', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 500, lineHeight: 1.3, marginBottom: 24 }}>{profile.title}</h2>
        <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: 17, lineHeight: 1.75, marginBottom: 20, maxWidth: 600 }}>{profile.desc}</p>
        <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 15, lineHeight: 1.7, marginBottom: 40, borderLeft: '2px solid rgba(232,168,32,0.4)', paddingLeft: 16 }}>{profile.next}</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="#notify" style={{ backgroundColor: '#E8A820', color: '#0F1B1F', padding: '14px 32px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Join the notification list</a>
          <a href="/methodology" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.7)', padding: '14px 32px', borderRadius: 6, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: '1px solid rgba(232,168,32,0.2)' }}>Read the methodology</a>
        </div>
        <div style={{ marginTop: 60, paddingTop: 40, borderTop: '1px solid rgba(232,168,32,0.15)' }}>
          <p style={{ color: 'rgba(245,240,232,0.35)', fontSize: 13 }}>Your results have been sent to your email. Scroll down to learn more about how GroundedVote works.</p>
        </div>
      </div>
    </div>
  )

  return null
}

export default function Home() {
  const forces = [
    { name: 'Identity Signaling', desc: 'Voting has become a performance of group membership. People increasingly vote against who they fear, not toward what they believe.' },
    { name: 'Fear Activation', desc: 'When fear is high, deliberation shrinks. Threat-based messaging is designed to keep the aperture narrow. It works.' },
    { name: 'Party Loyalty', desc: 'For most voters, the party label is enough. Policy goes unread. The party decides what you believe before you look.' },
    { name: 'Media Distortion', desc: 'The issues that drive clicks are rarely the issues that shape daily life. Culture war content generates revenue. Policy literacy does not.' },
  ]

  return (
    <>
      <CivicQuiz />

      <section style={{ backgroundColor: '#F5F0E8', padding: '120px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>The Problem</p>
            <h2 style={{ color: '#0F1B1F', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 12 }}>
              Voter disengagement is not<br />a motivation problem.
            </h2>
            <h2 style={{ color: '#0F1B1F', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 48 }}>
              It is an <em>information architecture</em> problem.
            </h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, backgroundColor: 'rgba(15,27,31,0.08)' }}>
            {forces.map((force, i) => (
              <Reveal key={force.name} delay={i * 80}>
                <div style={{ backgroundColor: '#F5F0E8', padding: '36px 28px' }}>
                  <p style={{ color: '#0F1B1F', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{force.name}</p>
                  <p style={{ color: 'rgba(15,27,31,0.6)', fontSize: 14, lineHeight: 1.7 }}>{force.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={320}>
            <div style={{ backgroundColor: '#0F1B1F', padding: '40px 40px', borderRadius: 8, marginTop: 2 }}>
              <p style={{ color: '#F5F0E8', fontSize: 18, fontWeight: 300, lineHeight: 1.6, maxWidth: 680 }}>
                &ldquo;The problem is not that voters are irrational. The problem is that the information environment systematically rewards tribal activation over policy alignment.&rdquo;
              </p>
              <p style={{ color: 'rgba(232,168,32,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 16 }}>GroundedVote Founding Framework · 2026</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ backgroundColor: '#0F1B1F', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 40, textAlign: 'center' }}>How It Works</p>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, position: 'relative' }}>
              {[
                { num: '01', title: 'Candidate Data', sub: 'Official records · Voting history · Campaign platforms · Verified public statements', icon: '◈' },
                { num: '02', title: 'Bias Audit', sub: 'Three AI models · Loaded language scored · Asymmetric framing flagged · Neutral variants selected', icon: '◎' },
                { num: '03', title: 'Civic Mirror', sub: 'Weighted issue quiz · Real population impact · Your match revealed · Full transparency', icon: '◉' },
              ].map((phase, i) => (
                <div key={phase.num} style={{ padding: '40px 28px', backgroundColor: i === 1 ? 'rgba(232,168,32,0.08)' : 'transparent', borderLeft: i > 0 ? '1px solid rgba(232,168,32,0.15)' : 'none', textAlign: 'center', position: 'relative' }}>
                  {i > 0 && (
                    <div style={{ position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', color: '#E8A820', fontSize: 20, fontWeight: 300 }}>→</div>
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
                Every question is publicly audited. Every bias score is archived. You can read the full methodology before you answer anything.
              </p>
              <a href="/methodology" style={{ display: 'inline-block', marginTop: 20, color: '#E8A820', fontSize: 13, fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(232,168,32,0.4)', paddingBottom: 2 }}>Read the full methodology →</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ backgroundColor: '#E8A820', padding: '60px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#0F1B1F', fontSize: 'clamp(20px, 3.5vw, 34px)', fontWeight: 300, lineHeight: 1.4 }}>
            Democracy works when the information does.
          </p>
        </div>
      </section>

      <section style={{ backgroundColor: '#0F1B1F', padding: '120px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>The Method</p>
            <h2 style={{ color: '#F5F0E8', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 64 }}>
              Three phases.<br />One civic mirror.
            </h2>
          </Reveal>

          {[
            { num: '01', phase: 'Candidate Data Collection', desc: 'Position data collected from official government records, voting history, verified campaign platforms, and third-party aggregators. Source hierarchy strictly enforced. Official records weighted highest.' },
            { num: '02', phase: 'Bias-Audited Question Generation', desc: 'A three-pass multi-model AI pipeline generates policy questions and scores each for loaded language, false equivalence, and asymmetric framing. Questions above the threshold are rewritten. The audit trail is public.' },
            { num: '03', phase: 'Civic Alignment', desc: 'You answer a weighted issue quiz calibrated to real population impact. The result: a civic mirror showing which candidates most closely match your actual beliefs — with full methodology transparency.' },
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
            <p style={{ color: 'rgba(15,27,31,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Built For Them First</p>
            <h2 style={{ color: '#0F1B1F', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 20 }}>
              The people this system harms most did not choose to be shut out.
            </h2>
            <p style={{ color: 'rgba(15,27,31,0.7)', fontSize: 16, lineHeight: 1.75 }}>
              First-generation voters. Low-income voters. Communities where local journalism died years ago. People who tried civic participation and got nothing back for it. They were shut out by design, not by apathy.
            </p>
            <p style={{ color: 'rgba(15,27,31,0.7)', fontSize: 16, lineHeight: 1.75, marginTop: 16 }}>
              GroundedVote was built for them first. It works for someone who has never followed an election closely. When they finish, they want to share it.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div style={{ backgroundColor: '#0F1B1F', borderRadius: 12, padding: 40 }}>
              <p style={{ color: '#E8A820', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Launch Notification</p>
              <h3 style={{ color: '#F5F0E8', fontSize: 22, fontWeight: 300, marginBottom: 8 }}>The quiz launches before the 2026 election cycle.</h3>
              <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>Join the list. Be notified when the full platform is live. Share it with one person who needs it.</p>
              <NotifyForm />
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ backgroundColor: '#F5F0E8', padding: '80px 24px', borderTop: '1px solid rgba(15,27,31,0.08)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <p style={{ color: '#0F1B1F', fontSize: 18, fontWeight: 400, marginBottom: 4 }}>Funders, civic partners, and academic reviewers.</p>
            <p style={{ color: 'rgba(15,27,31,0.5)', fontSize: 14 }}>The methodology white paper is available for review.</p>
          </div>
          <a href="/contact" style={{ backgroundColor: '#0F1B1F', color: '#E8A820', padding: '14px 32px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Contact the team</a>
        </div>
      </section>
    </>
  )
}
