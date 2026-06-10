export default function ThankYouPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F1B1F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>The Founded Project</p>
        <h1 style={{ color: '#F5F0E8', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.02em' }}>
          Thank you.
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.55)', fontSize: 17, lineHeight: 1.75, marginBottom: 12 }}>
          Your support keeps GroundedVote independent, nonpartisan, and free for every voter who needs it.
        </p>
        <p style={{ color: 'rgba(245,240,232,0.35)', fontSize: 14, lineHeight: 1.65, marginBottom: 40 }}>
          A confirmation has been sent to your email. Democracy works when the information does — and you just helped.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/align" style={{ backgroundColor: '#D8AB69', color: '#0F1B1F', padding: '14px 28px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Take the Quiz</a>
          <a href="/" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.7)', padding: '14px 28px', borderRadius: 6, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: '1px solid rgba(216,171,105,0.15)' }}>Back to Home</a>
        </div>
      </div>
    </div>
  )
}
