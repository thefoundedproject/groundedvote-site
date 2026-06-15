export const metadata = {
  title: 'About | GroundedVote',
  description: 'GroundedVote is built by The Founded Project LLC. Nonpartisan civic alignment for a healthier democracy — no party, no tribe, no fear.',
}

const S = {
  bg: '#0F1B1F', bgLight: '#F5F0E8', bgDark: '#060f11',
  gold: '#D8AB69', teal: '#5ECFA6', text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)', faint: 'rgba(245,240,232,0.25)',
  border: 'rgba(216,171,105,0.15)',
}

export default function About() {
  return (
    <>
      {/* Hero */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(48px, 8vh, 96px) 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>About</p>
          <h1 style={{ color: S.text, fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20 }}>
            Who built this and why.
          </h1>
          <p style={{ color: S.muted, fontSize: 17, lineHeight: 1.75, maxWidth: 580 }}>
            We're a small team from Minneapolis who got tired of watching elections get turned into a game of fear and loyalty. So we built a tool that does something radical — tells you the truth about where the candidates actually stand, then matches them to what you actually believe.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section style={{ backgroundColor: S.bgDark, padding: 'clamp(40px, 7vh, 80px) 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>The Problem</p>
          <h2 style={{ color: S.text, fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 20 }}>
            Most people go into the booth and pick the team.
          </h2>
          <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>
            Not because they're lazy. Because nobody gave them a real way to compare. The party replaced the policy. Media turned elections into a sport. Outrage replaced information. And somewhere in all of that, your actual beliefs got lost.
          </p>
          <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.8, marginBottom: 0 }}>
            GroundedVote exists to close that gap. Not by telling you what to think — but by showing you what you already think, and which candidates come closest to it.
          </p>
        </div>
      </section>

      {/* The approach */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(40px, 7vh, 80px) 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>The Approach</p>
          <h2 style={{ color: S.text, fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 20 }}>
            The questions are checked before they reach you.
          </h2>
          <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>
            Every question on GroundedVote was built by AI, then checked by a second AI for bias, then selected by a third. Not one person with an agenda deciding what you read. The whole audit trail is public — you can see every version of every question and why it was chosen or rejected.
          </p>
          <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
            No party labels during the quiz. No loaded language. No framing that tips you toward an answer. Just the policy — and where you stand on it.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/methodology" style={{ backgroundColor: 'rgba(216,171,105,0.1)', color: S.gold, padding: '11px 22px', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none', border: `1px solid ${S.border}` }}>
              Read the full methodology →
            </a>
            <a href="/audit" style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: S.muted, padding: '11px 22px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: `1px solid ${S.border}` }}>
              View the audit trail →
            </a>
          </div>
        </div>
      </section>

      {/* The Founded Project */}
      <section style={{ backgroundColor: S.bgLight, padding: 'clamp(40px, 7vh, 80px) 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>The Founded Project LLC</p>
          <h2 style={{ color: '#0F1B1F', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 20 }}>
            A civic technology ecosystem.
          </h2>
          <p style={{ color: 'rgba(15,27,31,0.6)', fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>
            The Founded Project LLC is a Minneapolis-based company building tools that help people think more clearly — about politics, media, and their own communities. GroundedVote is our main project for the 2026 election cycle.
          </p>
          <p style={{ color: 'rgba(15,27,31,0.6)', fontSize: 15, lineHeight: 1.8, marginBottom: 28 }}>
            We also build RhetoricalPoints (tools that help people recognize media spin), RootedReclaimers (community health), and LowLight Vibes. All of it comes from the same idea: technology should work for the people using it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { name: 'GroundedVote', desc: 'Civic alignment engine', href: '/', current: true },
              { name: 'RhetoricalPoints', desc: 'Media literacy tools', href: 'https://rhetoricalpoints.com', current: false },
              { name: 'RootedReclaimers', desc: 'Community health', href: '#', current: false },
              { name: 'LowLight Vibes', desc: 'Creative community', href: '#', current: false },
            ].map(({ name, desc, href, current }) => (
              <a key={name} href={href} style={{ display: 'block', padding: '16px 18px', backgroundColor: current ? 'rgba(216,171,105,0.12)' : 'rgba(15,27,31,0.05)', borderRadius: 8, border: `1.5px solid ${current ? 'rgba(216,171,105,0.4)' : 'rgba(15,27,31,0.12)'}`, textDecoration: 'none' }}>
                <p style={{ color: current ? S.gold : '#0F1B1F', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{name}</p>
                <p style={{ color: 'rgba(15,27,31,0.5)', fontSize: 12, margin: 0 }}>{desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ backgroundColor: S.bgDark, padding: 'clamp(40px, 7vh, 80px) 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>What We Stand For</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              ['No party. No tribe. No fear.', 'We do not favor any political party. We do not accept funding from candidates, PACs, or partisan organizations. Our only interest is in voters knowing what they believe and who most closely shares it.'],
              ['Transparency as a product feature.', 'Every question\'s full audit record is public. Every candidate position\'s source is labeled. Every limitation in our methodology is disclosed. Transparency is not a PR commitment — it is built into the system.'],
              ['Checking out makes sense. We\'re giving you a reason to come back.', 'If you stopped voting or stopped caring, that\'s not apathy. That\'s what happens when the system doesn\'t work for you. We\'re building something that might change that.'],
              ['No advertising. Ever.', 'GroundedVote runs on donations and grants. No advertiser, candidate, or PAC pays to influence what questions you see or how your results come out.'],
            ].map(([title, body]) => (
              <div key={title} style={{ padding: '20px 0', borderBottom: `1px solid rgba(216,171,105,0.07)` }}>
                <p style={{ color: S.text, fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{title}</p>
                <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: S.bg, padding: 'clamp(40px, 7vh, 80px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Ready?</p>
          <h2 style={{ color: S.text, fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.02em' }}>
            Find out where you actually stand.
          </h2>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/align" style={{ backgroundColor: S.gold, color: '#0F1B1F', padding: '14px 32px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Take the quiz →
            </a>
            <a href="/contact" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: S.muted, padding: '14px 24px', borderRadius: 6, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: `1px solid ${S.border}` }}>
              Contact us
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
