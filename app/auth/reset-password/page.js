// © 2025 The Founded Project LLC — All rights reserved.
// app/auth/reset-password/page.js
//
// Without ?token= — request a reset link by email.
// With ?token= — set the new password.

'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthShell, Field, SubmitButton, ErrorNote, S } from '../auth-ui'

function RequestForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell title="Check your email." subtitle={`If an account exists for ${email}, a reset link is on its way. It works for one hour.`}>
        <a href="/auth/login" style={{ color: S.gold, fontSize: 14, textDecoration: 'none' }}>Back to sign in</a>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset your password." subtitle="Enter your email and we will send a reset link.">
      <form onSubmit={handleSubmit}>
        <Field label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        <SubmitButton loading={loading}>Send reset link</SubmitButton>
      </form>
    </AuthShell>
  )
}

function SetForm({ token }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Something went wrong. Try again.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <AuthShell title="Password updated." subtitle="Your new password is set.">
        <a href="/auth/login" style={{ color: S.gold, fontSize: 14, textDecoration: 'none' }}>Sign in →</a>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password.">
      <form onSubmit={handleSubmit}>
        <ErrorNote>{error}</ErrorNote>
        <Field label="New password" type="password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" />
        <SubmitButton loading={loading}>Set password</SubmitButton>
      </form>
    </AuthShell>
  )
}

function ResetInner() {
  const params = useSearchParams()
  const token = params.get('token')
  return token ? <SetForm token={token} /> : <RequestForm />
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  )
}
