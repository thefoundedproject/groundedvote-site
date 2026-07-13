// © 2025 The Founded Project LLC — All rights reserved.
// app/auth/auth-ui.js — shared building blocks for the auth pages.

'use client'

export const S = {
  navy: '#0C1A2E',
  gold: '#E8A820',
  cream: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)',
  border: 'rgba(232,168,32,0.3)',
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: S.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>GroundedVote</p>
        <h1 style={{ color: S.cream, fontSize: 26, fontWeight: 300, lineHeight: 1.3, marginBottom: 8 }}>{title}</h1>
        {subtitle && <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.65, marginBottom: 28 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

export function Field({ label, ...props }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', color: S.muted, fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</span>
      <input
        {...props}
        style={{ width: '100%', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.08)', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 15, color: 'white', outline: 'none', boxSizing: 'border-box' }}
      />
    </label>
  )
}

export function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{ width: '100%', backgroundColor: S.gold, color: S.navy, padding: '15px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', marginTop: 6 }}
    >
      {loading ? 'One moment…' : children}
    </button>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return (
    <p style={{ color: '#E88A8A', fontSize: 13, lineHeight: 1.5, margin: '0 0 14px', padding: '10px 14px', backgroundColor: 'rgba(232,138,138,0.08)', border: '1px solid rgba(232,138,138,0.25)', borderRadius: 6 }}>
      {children}
    </p>
  )
}
