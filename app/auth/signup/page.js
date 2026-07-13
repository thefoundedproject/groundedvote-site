// © 2025 The Founded Project LLC — All rights reserved.
// app/auth/signup/page.js

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { AuthShell, Field, SubmitButton, ErrorNote, S } from '../auth-ui'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [researchOptIn, setResearchOptIn] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, researchOptIn }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.')
        setLoading(false)
        return
      }
      // Sign in with the same credentials, then start the Civic Mirror
      const login = await signIn('credentials', { email, password, redirect: false })
      if (login?.error) {
        // Account may already exist with a different password
        setError('This email may already have an account. Try signing in instead.')
        setLoading(false)
        return
      }
      window.location.href = '/onboarding/quiz'
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account."
      subtitle="Six short questions come next. They shape how your quiz results are scored."
    >
      <form onSubmit={handleSubmit}>
        <ErrorNote>{error}</ErrorNote>
        <Field label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        <Field label="Password" type="password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" />

        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', margin: '18px 0 8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={researchOptIn}
            onChange={e => setResearchOptIn(e.target.checked)}
            style={{ marginTop: 3, width: 16, height: 16, accentColor: S.gold }}
          />
          <span style={{ color: S.muted, fontSize: 13, lineHeight: 1.6 }}>
            May we include your anonymized quiz results in civic research data? Your name and address are never shared. This is optional and you can change it anytime.
          </span>
        </label>

        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>

      <p style={{ color: S.muted, fontSize: 13, marginTop: 22 }}>
        Already have an account?{' '}
        <a href="/auth/login" style={{ color: S.gold, textDecoration: 'none' }}>Sign in</a>
      </p>
    </AuthShell>
  )
}
