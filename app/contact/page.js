'use client'

// © 2025 The Founded Project LLC — All rights reserved.
// app/contact/page.js — the page behind every "Contact the team" link.
// Posts to /api/contact (Resend, rate-limited 3/hr/IP).

import { useState } from 'react'

const C = {
  bg: '#0F1B1F',
  bgCard: 'rgba(255,255,255,0.04)',
  gold: '#D8AB69',
  goldDim: 'rgba(216,171,105,0.4)',
  text: '#F5F0E8',
  textMuted: 'rgba(245,240,232,0.6)',
  border: 'rgba(216,171,105,0.2)',
  error: '#E57373',
  active: '#5ECFA6',
}

const inputStyle = {
  width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', color: C.text,
  border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 14px',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', organization: '', contactType: 'Voter', message: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('sending'); setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send.')
      setStatus('sent')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: 'clamp(32px, 8vh, 90px) 24px 100px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
          Contact
        </p>
        <h1 style={{ color: C.text, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 300, lineHeight: 1.15, marginBottom: 10, letterSpacing: '-0.02em' }}>
          Reach the team.
        </h1>
        <p style={{ color: C.textMuted, fontSize: 15, lineHeight: 1.65, marginBottom: 36 }}>
          Voters, press, researchers, campaigns — every message lands with a person.
          Corrections to candidate data get priority; the audit trail depends on them.
        </p>

        {status === 'sent' ? (
          <div style={{ backgroundColor: 'rgba(94,207,166,0.08)', border: '1px solid rgba(94,207,166,0.35)', borderRadius: 10, padding: '26px 28px' }}>
            <p style={{ color: C.active, fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Sent.</p>
            <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Your message is in the queue. Replies come from the team directly.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <label style={{ display: 'block' }}>
                <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Name *</span>
                <input required value={form.name} onChange={set('name')} style={inputStyle} autoComplete="name" />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email *</span>
                <input required type="email" value={form.email} onChange={set('email')} style={inputStyle} autoComplete="email" />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <label style={{ display: 'block' }}>
                <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Organization</span>
                <input value={form.organization} onChange={set('organization')} style={inputStyle} autoComplete="organization" />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>I am a…</span>
                <select value={form.contactType} onChange={set('contactType')} style={{ ...inputStyle, appearance: 'auto' }}>
                  {['Voter', 'Press', 'Researcher', 'Campaign', 'Data correction', 'Other'].map(o => (
                    <option key={o} value={o} style={{ color: '#0F1B1F' }}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
            <label style={{ display: 'block' }}>
              <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Message *</span>
              <textarea required rows={6} value={form.message} onChange={set('message')} style={{ ...inputStyle, resize: 'vertical' }} />
            </label>

            {error && <p style={{ color: C.error, fontSize: 13, margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                backgroundColor: C.gold, color: '#0F1B1F', padding: '14px 32px', borderRadius: 6,
                fontWeight: 700, fontSize: 14, border: 'none', cursor: status === 'sending' ? 'wait' : 'pointer',
                fontFamily: 'inherit', alignSelf: 'flex-start', opacity: status === 'sending' ? 0.7 : 1,
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
