'use client'

import { useState } from 'react'

const PRESET_AMOUNTS = [10, 25, 50, 100]

function DonationCard({ title, desc, amount, monthly, onCheckout, loading }) {
  const [email, setEmail] = useState('')
  const [custom, setCustom] = useState('')
  const [selected, setSelected] = useState(amount || 25)

  const finalAmount = custom ? parseInt(custom) : selected

  const handleSubmit = (e) => {
    e.preventDefault()
    onCheckout({ amount: finalAmount * 100, email, monthly })
  }

  return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(216,171,105,0.2)', borderRadius: 12, padding: 36 }}>
      <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
        {monthly ? 'Monthly Supporter' : 'One-Time Support'}
      </p>
      <h3 style={{ color: '#F5F0E8', fontSize: 22, fontWeight: 300, lineHeight: 1.3, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 14, lineHeight: 1.65, marginBottom: 28 }}>{desc}</p>

      <form onSubmit={handleSubmit}>
        {/* Amount selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {PRESET_AMOUNTS.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => { setSelected(a); setCustom('') }}
              style={{
                padding: '10px 0', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                backgroundColor: selected === a && !custom ? '#D8AB69' : 'rgba(255,255,255,0.06)',
                color: selected === a && !custom ? '#0F1B1F' : '#F5F0E8',
              }}
            >
              ${a}
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="Custom amount"
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(null) }}
          min="1"
          style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(216,171,105,0.2)', borderRadius: 6, fontSize: 14, color: '#F5F0E8', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
        />
        <input
          type="email"
          placeholder="your@email.com (optional)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(216,171,105,0.2)', borderRadius: 6, fontSize: 14, color: '#F5F0E8', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
        />
        <button
          type="submit"
          disabled={loading || !finalAmount || finalAmount < 1}
          style={{ width: '100%', backgroundColor: loading ? 'rgba(216,171,105,0.4)' : '#D8AB69', color: '#0F1B1F', padding: '15px', borderRadius: 6, fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'default' : 'pointer' }}
        >
          {loading ? 'Redirecting...' : `Support with $${finalAmount || '?'}${monthly ? '/mo' : ''} →`}
        </button>
      </form>
    </div>
  )
}

export default function SupportPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCheckout = async ({ amount, email, monthly }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'groundedvote',
          product: monthly ? 'donation_monthly' : 'donation_once',
          email: email || undefined,
          amount: monthly ? undefined : amount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <section style={{ backgroundColor: '#0F1B1F', padding: '96px 24px 60px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Support GroundedVote</p>
          <h1 style={{ color: '#F5F0E8', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20 }}>
            Democracy works<br />when the information does.
          </h1>
          <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 18, lineHeight: 1.75, maxWidth: 560 }}>
            GroundedVote is free to use — and built to stay that way. It runs on server costs, AI API calls, and the time it takes to verify candidate data. Your support keeps it independent, nonpartisan, and alive.
          </p>
        </div>
      </section>

      <section style={{ backgroundColor: '#0F1B1F', padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {error && (
            <div style={{ backgroundColor: '#B71C1C', color: 'white', padding: '12px 20px', borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <DonationCard
              title="Support the mission once."
              desc="Covers AI pipeline costs, server fees, and candidate data verification. Every dollar goes toward keeping the platform nonpartisan and free."
              monthly={false}
              onCheckout={handleCheckout}
              loading={loading}
            />
            <DonationCard
              title="Become a monthly supporter."
              desc="Sustaining supporters make long-term development possible — expanding to more races, improving the methodology, and keeping the platform free for voters who need it most."
              monthly={true}
              onCheckout={handleCheckout}
              loading={loading}
            />
          </div>
        </div>
      </section>

      {/* What support does */}
      <section style={{ backgroundColor: '#F5F0E8', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 32 }}>Where It Goes</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {[
              { label: 'AI Pipeline', desc: 'Every question goes through a 3-pass bias audit using Claude and GPT-4. Each race costs real API dollars to generate.' },
              { label: 'Candidate Research', desc: 'Verifying positions, cross-referencing voting records, and seeding new races takes time and data costs.' },
              { label: 'Server Infrastructure', desc: 'Railway hosting, PostgreSQL database, and email delivery keep the platform running year-round.' },
              { label: 'Expanding Coverage', desc: 'More races, more states, earlier coverage. Your support funds the next 50 races added to the platform.' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ color: '#0F1B1F', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{item.label}</p>
                <p style={{ color: 'rgba(15,27,31,0.6)', fontSize: 14, lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner CTA */}
      <section style={{ backgroundColor: '#0F1B1F', padding: '60px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <p style={{ color: '#F5F0E8', fontSize: 17, fontWeight: 400, marginBottom: 4 }}>Interested in a larger partnership or grant?</p>
            <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 14 }}>Civic organizations and foundations — reach out directly.</p>
          </div>
          <a href="/contact" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#D8AB69', padding: '12px 28px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(216,171,105,0.2)' }}>Contact the Team</a>
        </div>
      </section>
    </>
  )
}
