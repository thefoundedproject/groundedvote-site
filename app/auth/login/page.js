// © 2025 The Founded Project LLC — All rights reserved.
// app/auth/login/page.js

'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { AuthShell, Field, SubmitButton, ErrorNote, S } from '../auth-ui'

function LoginForm() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const v = params.get('verified')
    if (v === '1') setNotice('Email confirmed. Sign in to continue.')
    if (v === 'expired') setError('That confirmation link has expired. Sign in and we will send a fresh one.')
  }, [params])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) {
      setError('That email and password combination did not match.')
      setLoading(false)
      return
    }
    window.location.href = '/align'
  }

  return (
    <AuthShell title="Sign in." subtitle="Pick up where you left off.">
      <form onSubmit={handleSubmit}>
        {notice && (
          <p style={{ color: '#5ECFA6', fontSize: 13, margin: '0 0 14px', padding: '10px 14px', backgroundColor: 'rgba(94,207,166,0.08)', border: '1px solid rgba(94,207,166,0.25)', borderRadius: 6 }}>
            {notice}
          </p>
        )}
        <ErrorNote>{error}</ErrorNote>
        <Field label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
        <Field label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22 }}>
        <a href="/auth/reset-password" style={{ color: S.muted, fontSize: 13, textDecoration: 'none' }}>Forgot password?</a>
        <a href="/auth/signup" style={{ color: S.gold, fontSize: 13, textDecoration: 'none' }}>Create an account</a>
      </div>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
