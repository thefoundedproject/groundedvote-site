import Link from 'next/link'

export const metadata = {
  title: '404 — Page Not Found | GroundedVote',
}

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F1B1F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 24 }}>
          404 — Page Not Found
        </p>
        <h1 style={{ color: '#F5F0E8', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20 }}>
          This page doesn't exist.
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 16, lineHeight: 1.7, marginBottom: 48, maxWidth: 380, margin: '0 auto 48px' }}>
          The link may be broken or the page may have moved. GroundedVote covers 21 states and 35 competitive races for 2026 — find yours below.
        </p>

        {/* Navigation tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 40 }}>
          {[
            { href: '/align', label: 'Find My Match', desc: 'Take the alignment quiz', primary: true },
            { href: '/', label: 'Home', desc: 'Back to the start', primary: false },
            { href: '/how-it-works', label: 'How It Works', desc: 'Our methodology overview', primary: false },
            { href: '/support', label: 'Support Us', desc: 'Keep the engine running', primary: false },
          ].map(({ href, label, desc, primary }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block', padding: '18px 20px', borderRadius: 8, textDecoration: 'none',
                backgroundColor: primary ? 'rgba(216,171,105,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${primary ? 'rgba(216,171,105,0.35)' : 'rgba(216,171,105,0.1)'}`,
                textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <p style={{ color: primary ? '#D8AB69' : '#F5F0E8', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{label}</p>
              <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 12, margin: 0 }}>{desc}</p>
            </Link>
          ))}
        </div>

        <p style={{ color: 'rgba(245,240,232,0.2)', fontSize: 11 }}>
          GroundedVote · The Founded Project LLC · Minneapolis, MN
        </p>
      </div>
    </div>
  )
}
