// © 2025 The Founded Project LLC — All rights reserved.
// app/onboarding/quiz/page.js
//
// Quiz 1 — the Civic Mirror. Six questions, one at a time, shown after
// signup. Answers set the user's issue weights and conviction factor,
// which shape how every ballot quiz is scored. Calm by design: no clock,
// no score, a quiet step marker.

'use client'

import { useState } from 'react'
import { CIVIC_QUIZ } from '@/lib/civic-mirror'

const S = {
  navy: '#0C1A2E',
  gold: '#E8A820',
  cream: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)',
  border: 'rgba(232,168,32,0.3)',
}

export default function CivicMirrorPage() {
  const [step, setStep] = useState(0)          // 0 = intro, 1..6 = questions, 7 = saving/done
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const question = CIVIC_QUIZ[step - 1]

  const submit = async (finalAnswers) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/civic-mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      })
      if (res.status === 401) {
        window.location.href = '/auth/login'
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Your answers could not be saved. They are still here — try again.')
        setSaving(false)
        return
      }
      window.location.href = '/align'
    } catch {
      setError('Your answers could not be saved. They are still here — try again.')
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (!selected) return
    const newAnswers = [...answers, {
      q: question.q,
      key: question.key,
      value: selected,
      a: question.options.find(o => o.value === selected).label,
    }]
    setAnswers(newAnswers)
    setSelected(null)
    if (step < CIVIC_QUIZ.length) {
      setStep(step + 1)
    } else {
      setStep(CIVIC_QUIZ.length + 1)
      submit(newAnswers)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: S.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
          The Civic Mirror
        </p>

        {step === 0 && (
          <>
            <h1 style={{ color: S.cream, fontSize: 28, fontWeight: 300, lineHeight: 1.3, marginBottom: 14 }}>
              Six questions about how you vote today.
            </h1>
            <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 10 }}>
              Two of them ask which issues matter most to you. Those answers carry extra weight when we score your ballot quiz, so your results reflect what you actually care about.
            </p>
            <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
              There are no wrong answers here. Take your time.
            </p>
            <button
              onClick={() => setStep(1)}
              style={{ backgroundColor: S.gold, color: S.navy, padding: '15px 36px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Begin
            </button>
          </>
        )}

        {step >= 1 && step <= CIVIC_QUIZ.length && (
          <>
            <p style={{ color: S.muted, fontSize: 12, marginBottom: 18 }}>{step} of {CIVIC_QUIZ.length}</p>
            <h1 style={{ color: S.cream, fontSize: 24, fontWeight: 300, lineHeight: 1.4, marginBottom: question.note ? 8 : 28 }}>
              {question.q}
            </h1>
            {question.note && (
              <p style={{ color: S.gold, fontSize: 13, marginBottom: 24 }}>{question.note}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {question.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  style={{
                    textAlign: 'left',
                    padding: '16px 18px',
                    backgroundColor: selected === opt.value ? 'rgba(232,168,32,0.14)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selected === opt.value ? S.gold : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 8,
                    color: S.cream,
                    fontSize: 14,
                    lineHeight: 1.5,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleNext}
              disabled={!selected}
              style={{ backgroundColor: S.gold, color: S.navy, padding: '15px 36px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: selected ? 'pointer' : 'default', opacity: selected ? 1 : 0.4, fontFamily: 'inherit' }}
            >
              {step === CIVIC_QUIZ.length ? 'Finish' : 'Next'}
            </button>
          </>
        )}

        {step > CIVIC_QUIZ.length && (
          <>
            <h1 style={{ color: S.cream, fontSize: 26, fontWeight: 300, lineHeight: 1.3, marginBottom: 14 }}>
              {saving ? 'Saving your answers…' : error ? 'One more try.' : 'Done.'}
            </h1>
            {error && (
              <>
                <p style={{ color: '#E88A8A', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{error}</p>
                <button
                  onClick={() => submit(answers)}
                  style={{ backgroundColor: S.gold, color: S.navy, padding: '15px 36px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Save again
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
