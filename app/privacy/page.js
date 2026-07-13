export const metadata = {
  title: 'Privacy Policy | GroundedVote',
  description: 'How GroundedVote collects, uses, and protects your information.',
}

const S = {
  bg: '#0F1B1F', gold: '#D8AB69', text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.6)', faint: 'rgba(245,240,232,0.35)',
  border: 'rgba(216,171,105,0.12)',
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40, paddingBottom: 40, borderBottom: `1px solid ${S.border}` }}>
      <h2 style={{ color: S.gold, fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 14 }}>{title}</h2>
      <div style={{ color: S.muted, fontSize: 15, lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

function DataRow({ collected, why, stored, shared }) {
  return (
    <tr>
      <td style={{ padding: '10px 12px', color: S.text, fontSize: 13, borderBottom: `1px solid rgba(216,171,105,0.08)` }}>{collected}</td>
      <td style={{ padding: '10px 12px', color: S.muted, fontSize: 13, borderBottom: `1px solid rgba(216,171,105,0.08)` }}>{why}</td>
      <td style={{ padding: '10px 12px', color: S.muted, fontSize: 13, borderBottom: `1px solid rgba(216,171,105,0.08)` }}>{stored}</td>
      <td style={{ padding: '10px 12px', color: S.muted, fontSize: 13, borderBottom: `1px solid rgba(216,171,105,0.08)` }}>{shared}</td>
    </tr>
  )
}

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: S.bg, minHeight: '100vh', padding: 'clamp(48px, 8vh, 96px) 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>Legal</p>
        <h1 style={{ color: S.text, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ color: S.faint, fontSize: 13, marginBottom: 48 }}>
          Effective: June 1, 2026 · The Founded Project LLC · Minneapolis, MN
        </p>

        <Section title="The short version">
          <p>You can use the quiz without an account — anonymous quiz answers are stored by session ID. If you create an account, we store your email, a hashed password, and your quiz history so your results carry across visits. Sharing your data for civic research is a separate, optional choice you make at signup, and you can change it anytime. We never sell your data. No ads. No tracking pixels. No data brokers.</p>
        </Section>

        <Section title="What we collect and why">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr>
                  {['What', 'Why', 'How long', 'Shared with'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', color: S.faint, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'left', borderBottom: `1px solid ${S.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <DataRow collected="Quiz answers" why="Compute alignment score" stored="Session lifetime" shared="Nobody" />
                <DataRow collected="Anonymous session ID" why="Link answers to results" stored="90 days" shared="Nobody" />
                <DataRow collected="Email address (optional)" why="Send your results or state launch alert" stored="Until you unsubscribe" shared="Nobody" />
                <DataRow collected="State / ZIP code" why="Route you to relevant races" stored="Session lifetime" shared="Nobody" />
                <DataRow collected="IP address (rate limiting)" why="Prevent abuse" stored="60 seconds (in-memory only)" shared="Nobody" />
                <DataRow collected="Payment info (donors)" why="Process donation via Stripe" stored="Stripe handles this" shared="Stripe only" />
                <DataRow collected="Account email + hashed password (optional)" why="Sign-in, saved results, weighted scoring" stored="Until you delete your account" shared="Nobody" />
                <DataRow collected="Onboarding quiz profile (accounts)" why="Weight your ballot quiz by the issues you said matter most" stored="Until you delete your account" shared="Nobody" />
                <DataRow collected="Anonymized quiz results (opt-in only)" why="Civic research aggregates — never with your name or address" stored="Aggregated; individual rows deletable on request" shared="Researchers and press, aggregate form only" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="What we do not do">
          <ul style={{ paddingLeft: 20 }}>
            {[
              'Sell your email or quiz data to any third party',
              'Share data with campaigns, PACs, or political organizations',
              'Run ad tracking or behavioral profiling',
              'Use your responses to train AI models without consent',
              'Store your full address or precise geolocation',
              'Require you to create an account to take the quiz',
              'Include your data in research without your explicit opt-in at signup',
            ].map(item => (
              <li key={item} style={{ marginBottom: 10 }}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Cookies and local storage">
          <p>GroundedVote does not use advertising cookies. We may store a session identifier in your browser's session storage to maintain quiz state during your visit. This is cleared when you close the browser tab.</p>
        </Section>

        <Section title="Third-party services">
          <p>We use the following services, each with their own privacy practices:</p>
          <ul style={{ paddingLeft: 20, marginTop: 10 }}>
            <li style={{ marginBottom: 8 }}><strong style={{ color: S.text }}>Resend</strong> — transactional email delivery for results and notifications</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: S.text }}>Stripe</strong> — payment processing for donations (we never see your card number)</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: S.text }}>Railway</strong> — cloud hosting provider (PostgreSQL + Next.js runtime)</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: S.text }}>Anthropic Claude / OpenAI GPT-4o</strong> — AI model inference for question generation and position extraction (no user PII is sent to these services)</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: S.text }}>Congress.gov / US Census Bureau</strong> — public APIs for candidate and geocoding data</li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>You may request deletion of any data associated with your email address at any time by contacting us. Because quiz sessions are anonymous, we cannot link them to you without the session ID you provide. Minnesota residents may have additional rights under state privacy law.</p>
        </Section>

        <Section title="Children">
          <p>GroundedVote is intended for users 18 and older. We do not knowingly collect data from minors. If you believe we have inadvertently collected information from a minor, contact us immediately.</p>
        </Section>

        <Section title="Changes">
          <p>We'll update this policy as the platform grows. Material changes will be noted with a new effective date. Continued use constitutes acceptance.</p>
        </Section>

        <div style={{ color: S.muted, fontSize: 14, lineHeight: 1.8 }}>
          <p>Questions? <a href="/contact" style={{ color: S.gold, textDecoration: 'none' }}>Contact us</a> · The Founded Project LLC · Minneapolis, MN</p>
        </div>
      </div>
    </div>
  )
}
