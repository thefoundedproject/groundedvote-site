export const metadata = {
  title: 'Terms of Service | GroundedVote',
  description: 'GroundedVote Terms of Service — how you may use this civic alignment platform.',
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

export default function TermsPage() {
  return (
    <div style={{ backgroundColor: S.bg, minHeight: '100vh', padding: 'clamp(48px, 8vh, 96px) 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>Legal</p>
        <h1 style={{ color: S.text, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Terms of Service
        </h1>
        <p style={{ color: S.faint, fontSize: 13, marginBottom: 48 }}>
          Effective: June 1, 2026 · The Founded Project LLC · Minneapolis, MN
        </p>

        <Section title="1. Who We Are">
          <p>GroundedVote is a civic alignment tool operated by The Founded Project LLC, a Minnesota limited liability company. We are a nonpartisan platform. We are not affiliated with any political party, campaign, PAC, or government agency.</p>
        </Section>

        <Section title="2. What GroundedVote Does">
          <p>GroundedVote uses AI to generate policy questions for competitive federal races, extracts candidate position estimates from public records and statements, and computes an alignment score between your answers and each candidate's estimated positions. <strong style={{ color: S.text }}>Scores are estimates, not endorsements.</strong> They reflect AI inference from available evidence, not guaranteed candidate intent.</p>
        </Section>

        <Section title="3. Acceptable Use">
          <p>You may use GroundedVote for personal civic research. You may not:</p>
          <ul style={{ paddingLeft: 20, marginTop: 10 }}>
            <li style={{ marginBottom: 8 }}>Use our platform or API to train competing AI models without written permission</li>
            <li style={{ marginBottom: 8 }}>Scrape, bulk-download, or redistribute candidate position data for commercial purposes</li>
            <li style={{ marginBottom: 8 }}>Misrepresent GroundedVote scores as official candidate endorsements or positions</li>
            <li style={{ marginBottom: 8 }}>Attempt to manipulate or reverse-engineer the bias audit pipeline</li>
            <li style={{ marginBottom: 8 }}>Use the platform in violation of any applicable law</li>
          </ul>
        </Section>

        <Section title="4. AI-Generated Content">
          <p>Questions and candidate positions are generated or inferred by AI models (Anthropic Claude, OpenAI GPT-4o) and reviewed through a 3-pass bias audit. Despite this, AI outputs may contain errors, omissions, or outdated information. We do not guarantee accuracy. You should verify important claims through primary sources before making voting decisions.</p>
          <p style={{ marginTop: 12 }}>Confidence scores indicate evidence strength, not certainty. Party inference positions (35–50% confidence) are particularly uncertain and should be treated as rough estimates only.</p>
        </Section>

        <Section title="5. Data and Privacy">
          <p>Your quiz responses are stored anonymously by session ID. We do not require account creation. If you provide your email address for results delivery or state launch notifications, we store it solely for that purpose and will not sell or share it with third parties. See our <a href="/privacy" style={{ color: S.gold, textDecoration: 'none' }}>Privacy Policy</a> for full details.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>The GroundedVote name, visual design, methodology, and bias-audit pipeline are proprietary to The Founded Project LLC. Quiz questions and scoring data may not be reproduced commercially without permission. Candidate public records referenced in position extraction remain in the public domain.</p>
        </Section>

        <Section title="7. Disclaimers">
          <p>GroundedVote is provided "as is" without warranty of any kind. We are not responsible for voting decisions made based on alignment scores. Election information changes rapidly — always verify candidate positions through official campaign sources before election day.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>To the maximum extent permitted by law, The Founded Project LLC shall not be liable for any indirect, incidental, or consequential damages arising from use of GroundedVote. Our total liability for any claim shall not exceed the amount you paid us in the preceding 12 months (or $10 if you paid nothing).</p>
        </Section>

        <Section title="9. Changes to These Terms">
          <p>We may update these terms as the platform evolves. Material changes will be noted on this page with an updated effective date. Continued use after changes constitutes acceptance.</p>
        </Section>

        <Section title="10. Contact">
          <p>Questions about these terms: <a href="/contact" style={{ color: S.gold, textDecoration: 'none' }}>Contact us</a> or write to The Founded Project LLC, Minneapolis, MN.</p>
        </Section>
      </div>
    </div>
  )
}
