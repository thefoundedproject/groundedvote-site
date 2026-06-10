export const metadata = {
  title: 'How It Works | GroundedVote',
  description: 'GroundedVote matches you to candidates based on your actual policy beliefs — not your party, not your fear. Here is exactly how.',
}

export default function HowItWorks() {
  return (
    <>
      <section style={{ backgroundColor: '#0F1B1F', padding: '96px 24px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>How It Works</p>
          <h1 style={{ color: '#F5F0E8', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 24 }}>
            Three steps.<br />One honest answer.
          </h1>
          <p style={{ color: 'rgba(245,240,232,0.55)', fontSize: 18, lineHeight: 1.75, maxWidth: 560 }}>
            GroundedVote does not tell you what to think. It builds a neutral mirror — and shows you which candidates already match what you believe.
          </p>
        </div>
      </section>

      {/* Step 1 */}
      <section style={{ backgroundColor: '#F5F0E8', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Step 01</p>
            <h2 style={{ color: '#0F1B1F', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 20 }}>We collect what candidates actually say and do.</h2>
            <p style={{ color: 'rgba(15,27,31,0.7)', fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
              Every candidate in a supported race has their positions pulled from official government records, verified voting history, campaign platforms, and public statements. No summaries. No editorials. Source material only.
            </p>
            <p style={{ color: 'rgba(15,27,31,0.7)', fontSize: 16, lineHeight: 1.75 }}>
              Sources are ranked by reliability. Official records outrank campaign claims. Actions outrank words.
            </p>
          </div>
          <div style={{ backgroundColor: '#0F1B1F', borderRadius: 8, padding: 40 }}>
            <p style={{ color: 'rgba(216,171,105,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>Source Hierarchy</p>
            {[
              { rank: '1st', label: 'Official government records + voting history' },
              { rank: '2nd', label: 'Candidate-submitted questionnaires' },
              { rank: '3rd', label: 'Verified media interviews + public statements' },
              { rank: '4th', label: 'Third-party aggregators with documented sourcing' },
            ].map(item => (
              <div key={item.rank} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid rgba(216,171,105,0.1)' }}>
                <span style={{ color: '#D8AB69', fontWeight: 700, fontSize: 13, minWidth: 32 }}>{item.rank}</span>
                <p style={{ color: 'rgba(245,240,232,0.65)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section style={{ backgroundColor: '#0F1B1F', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'center' }}>
          <div style={{ order: 2 }}>
            <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Step 02</p>
            <h2 style={{ color: '#F5F0E8', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 20 }}>Every question is audited for bias before it reaches you.</h2>
            <p style={{ color: 'rgba(245,240,232,0.55)', fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
              A three-pass AI pipeline generates questions from candidate positions, then scores each for loaded language, false equivalence, and asymmetric framing. Questions that fail are rewritten. The audit trail is public.
            </p>
            <p style={{ color: 'rgba(245,240,232,0.55)', fontSize: 16, lineHeight: 1.75 }}>
              Two different AI providers are used so neither model's political tendencies dominate. The highest-scoring neutral variant is the one you see.
            </p>
          </div>
          <div style={{ order: 1 }}>
            {[
              { pass: 'Pass 1', title: 'Generation', desc: 'Claude generates 3–5 question variants from each candidate position using only behavioral language. No party names. No political labels.' },
              { pass: 'Pass 2', title: 'Bias Scoring', desc: 'GPT-4 scores each variant on four dimensions: loaded language, false equivalence, asymmetric framing, embedded cultural assumption. Scored blind — no knowledge of which model generated it.' },
              { pass: 'Pass 3', title: 'Selection', desc: 'The highest-scoring neutral variant is selected. All variants and scores are archived in the public audit trail.' },
            ].map((item, i) => (
              <div key={item.pass} style={{ padding: '20px 24px', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, borderLeft: '2px solid #D8AB69' }}>
                <p style={{ color: 'rgba(216,171,105,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>{item.pass}</p>
                <p style={{ color: '#F5F0E8', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{item.title}</p>
                <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section style={{ backgroundColor: '#F5F0E8', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'center' }}>
          <div>
            <p style={{ color: '#D8AB69', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Step 03</p>
            <h2 style={{ color: '#0F1B1F', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 20 }}>You answer. We show you who matches.</h2>
            <p style={{ color: 'rgba(15,27,31,0.7)', fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
              You select your state and race. You answer the bias-audited questions — not about candidates, but about policies. Do you support this approach? Would you back this position?
            </p>
            <p style={{ color: 'rgba(15,27,31,0.7)', fontSize: 16, lineHeight: 1.75, marginBottom: 24 }}>
              When you finish, the civic mirror reveals which candidates in your race most closely match what you actually said — with full scoring transparency so you can see exactly why.
            </p>
            <a href="/#quiz" style={{ display: 'inline-block', backgroundColor: '#0F1B1F', color: '#D8AB69', padding: '14px 32px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none', letterSpacing: '0.05em' }}>
              Take the awareness quiz →
            </a>
          </div>
          <div style={{ backgroundColor: '#0F1B1F', borderRadius: 8, padding: 40 }}>
            <p style={{ color: 'rgba(216,171,105,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>What You Get</p>
            {[
              { label: 'Your belief profile', desc: 'A clear picture of what you actually value, independent of party.' },
              { label: 'Candidate alignment scores', desc: 'Which candidates match your positions and by how much.' },
              { label: 'Issue-by-issue breakdown', desc: 'Where each candidate aligns and where they diverge.' },
              { label: 'Full methodology access', desc: 'Every question, every bias score, every source — available to review.' },
            ].map(item => (
              <div key={item.label} style={{ padding: '14px 0', borderBottom: '1px solid rgba(216,171,105,0.1)' }}>
                <p style={{ color: '#D8AB69', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.label}</p>
                <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section style={{ backgroundColor: '#D8AB69', padding: '60px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#0F1B1F', fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 300, lineHeight: 1.4, marginBottom: 20 }}>
            No party. No endorsement. No algorithm designed to keep you angry.
          </p>
          <a href="/methodology" style={{ display: 'inline-block', color: '#0F1B1F', fontSize: 13, fontWeight: 700, textDecoration: 'none', borderBottom: '2px solid rgba(15,27,31,0.4)', paddingBottom: 2 }}>
            Read the full methodology →
          </a>
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: '#0F1B1F', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <h2 style={{ color: '#F5F0E8', fontSize: 24, fontWeight: 300, marginBottom: 8 }}>Ready to find your match?</h2>
            <p style={{ color: 'rgba(245,240,232,0.45)', fontSize: 14 }}>The full platform launches before the 2026 election cycle.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/#quiz" style={{ backgroundColor: '#D8AB69', color: '#0F1B1F', padding: '14px 32px', borderRadius: 6, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Take the awareness quiz</a>
            <a href="/contact" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.7)', padding: '14px 32px', borderRadius: 6, fontWeight: 600, fontSize: 14, textDecoration: 'none', border: '1px solid rgba(216,171,105,0.2)' }}>Contact the team</a>
          </div>
        </div>
      </section>
    </>
  )
}
