export const metadata = {
  title: 'Methodology | GroundedVote',
  description: 'How GroundedVote generates bias-audited questions, extracts candidate positions, and computes your alignment score. Full technical methodology.',
}

const S = {
  bg: '#0F1B1F',
  bgLight: '#F5F0E8',
  gold: '#D8AB69',
  teal: '#5ECFA6',
  text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.5)',
  faint: 'rgba(245,240,232,0.25)',
  dark: '#0a1214',
  cardBorder: 'rgba(216,171,105,0.15)',
}

function Section({ bg, children, style = {} }) {
  return (
    <section style={{ backgroundColor: bg ?? S.bg, padding: 'clamp(48px, 8vh, 96px) 24px', ...style }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {children}
      </div>
    </section>
  )
}

function Overline({ children }) {
  return <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>{children}</p>
}

function StepCard({ number, title, model, children }) {
  return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${S.cardBorder}`, borderRadius: 10, padding: '28px 32px', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(216,171,105,0.15)', border: `1.5px solid rgba(216,171,105,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: S.gold, fontSize: 13, fontWeight: 700 }}>{number}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <p style={{ color: S.text, fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</p>
            {model && (
              <span style={{ backgroundColor: 'rgba(94,207,166,0.12)', color: S.teal, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                {model}
              </span>
            )}
          </div>
          <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{children}</p>
        </div>
      </div>
    </div>
  )
}

function SourceRow({ badge, color, bg, children }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0', borderBottom: `1px solid rgba(216,171,105,0.08)` }}>
      <span style={{ backgroundColor: bg, color, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, flexShrink: 0, marginTop: 2 }}>{badge}</span>
      <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.65, margin: 0 }}>{children}</p>
    </div>
  )
}

export default function Methodology() {
  return (
    <>
      {/* Hero */}
      <Section>
        <Overline>Methodology</Overline>
        <h1 style={{ color: S.text, fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20 }}>
          How GroundedVote works
        </h1>
        <p style={{ color: S.muted, fontSize: 17, lineHeight: 1.75, maxWidth: 580, marginBottom: 0 }}>
          If you want to trust a tool, you should be able to see inside it. Everything here — how we build the questions, how we check them for bias, how we score the candidates, how we calculate your match — is documented and public. No black boxes.
        </p>
      </Section>

      {/* Pipeline overview */}
      <Section bg={S.dark}>
        <Overline>The Pipeline</Overline>
        <h2 style={{ color: S.text, fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Five stages from public record to your match score
        </h2>
        <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
          No human editor decides what questions you see or how candidates are scored. Every stage is AI-driven, documented, and auditable.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { n: '1', label: 'Candidate data ingestion', desc: 'Congress.gov voting records, sponsored legislation, and manually-entered position statements are collected for each candidate.' },
            { n: '2', label: 'Question generation', desc: 'Claude generates four neutral question variants per policy topic, constrained to behavioral language ("Would you support a policy that..."). Party names and coded language are explicitly prohibited.' },
            { n: '3', label: 'Bias scoring', desc: 'GPT-4 scores each variant on four dimensions: ideological loading, assumption embedding, emotional framing, and factual accuracy. Scored blind — no model knows the other generated the variants.' },
            { n: '4', label: 'Variant selection', desc: 'Claude reviews bias scores and selects the lowest-scoring variant per topic. All variants, scores, and selection reasoning are archived to the public Audit Trail.' },
            { n: '5', label: 'Candidate position mapping', desc: 'Claude analyzes each candidate\'s record and assigns a 1–5 position on every approved question. Confidence is scored honestly and shown to voters. Source type is always disclosed.' },
          ].map(({ n, label, desc }) => (
            <div key={n} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: `1px solid rgba(216,171,105,0.07)` }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(216,171,105,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span style={{ color: S.gold, fontSize: 11, fontWeight: 700 }}>{n}</span>
              </div>
              <div>
                <p style={{ color: S.text, fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{label}</p>
                <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Bias audit detail */}
      <Section>
        <Overline>3-Pass Bias Audit</Overline>
        <h2 style={{ color: S.text, fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>
          No single model decides what you read
        </h2>
        <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
          Using one AI to both write and evaluate questions creates a self-serving loop. GroundedVote separates authorship from evaluation by using competing models with different training lineages.
        </p>
        <StepCard number="1" title="Generation" model="Claude Opus">
          Claude generates four variants of each question from candidate position data. The prompt enforces: no party names, no coded language (radical, extreme, socialist, MAGA), no embedded assumptions about reasonable positions. Questions must be under 40 words and directly grounded in the candidate's stated or recorded position.
        </StepCard>
        <StepCard number="2" title="Bias Scoring" model="GPT-4o">
          GPT-4 scores each variant from 0–100 on four dimensions: ideological loading (does framing favor one side?), assumption embedding (does the question imply a correct answer?), emotional amplification (does word choice provoke rather than inform?), and factual grounding (is the question accurately tied to the stated position?). GPT-4 scores all four variants blind — it does not know Claude wrote them.
        </StepCard>
        <StepCard number="3" title="Selection" model="Claude Sonnet">
          A second Claude instance reviews the four scored variants. It selects the question with the lowest composite bias score, or flags the set for human review if all variants exceed the bias threshold. The selection reasoning, scores, and all variants are written to the public Audit Trail.
        </StepCard>

        <div style={{ marginTop: 28, padding: '20px 24px', backgroundColor: 'rgba(94,207,166,0.06)', borderRadius: 8, border: '1px solid rgba(94,207,166,0.2)' }}>
          <p style={{ color: S.teal, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Public Audit Trail</p>
          <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            Every question's full audit record — all four variants, their bias scores, the selection reasoning, and which model made each decision — is publicly accessible at{' '}
            <a href="/audit" style={{ color: S.teal, textDecoration: 'none', fontWeight: 600 }}>/audit</a>.
            No account required.
          </p>
        </div>
      </Section>

      {/* Candidate position scoring */}
      <Section bg={S.dark}>
        <Overline>Candidate Positions</Overline>
        <h2 style={{ color: S.text, fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Where candidate scores come from
        </h2>
        <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Each candidate is assigned a 1–5 position on every quiz question (1 = strongly oppose, 5 = strongly support). The source and confidence level for every position is shown to voters on the results page.
        </p>

        <SourceRow badge="Voting Record" color="#5ECFA6" bg="rgba(94,207,166,0.12)">
          The most reliable source. For incumbents, Congress.gov voting data is pulled for the 119th Congress. Votes on directly relevant legislation are weighted most heavily. Confidence: 0.85–0.95.
        </SourceRow>
        <SourceRow badge="Public Statement" color="#7EC8E3" bg="rgba(126,200,227,0.12)">
          Statements from campaign websites, press releases, debate transcripts, or news interviews where the candidate directly addressed the policy topic. Confidence: 0.70–0.85.
        </SourceRow>
        <SourceRow badge="Campaign Platform" color="#B8A0D8" bg="rgba(184,160,216,0.12)">
          Positions drawn from the candidate's official platform documents. Less precise than direct statements but stronger than inference. Confidence: 0.60–0.75.
        </SourceRow>
        <SourceRow badge="Party Inference" color="#D8AB69" bg="rgba(216,171,105,0.12)">
          When direct evidence is unavailable, the candidate's party platform is used as a weak prior. The model is instructed not to stereotype — if direct evidence contradicts party norms, the evidence wins. Confidence: 0.35–0.50. Always displayed to voters.
        </SourceRow>

        <div style={{ marginTop: 24, padding: '16px 20px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${S.cardBorder}` }}>
          <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            <strong style={{ color: S.text }}>Confidence score displayed.</strong> Every candidate position card on the results page shows its source type. Positions with confidence below 0.65 display a numeric confidence percentage so voters can weight uncertain data appropriately.
          </p>
        </div>
      </Section>

      {/* Match algorithm */}
      <Section>
        <Overline>Match Scoring</Overline>
        <h2 style={{ color: S.text, fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>
          How your percentage is calculated
        </h2>
        <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Match scores use weighted cosine similarity on a 5-point agree/disagree scale, modified by the issue priorities you set during the quiz.
        </p>

        {/* Formula card */}
        <div style={{ backgroundColor: '#060f11', border: `1px solid ${S.cardBorder}`, borderRadius: 8, padding: '24px 28px', fontFamily: 'monospace', marginBottom: 28 }}>
          <p style={{ color: S.gold, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, fontFamily: 'inherit' }}>Scoring formula per question</p>
          <p style={{ color: 'rgba(94,207,166,0.9)', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
            similarity = 1 − |user_answer − candidate_answer| / 4<br />
            weight = question_weight × importance_multiplier × confidence<br />
            score += similarity × weight<br />
            <br />
            <span style={{ color: S.muted, fontSize: 12 }}>final_score = Σ(score) / Σ(weight) × 100</span>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Not a priority', mult: '0.33×', desc: 'Question counts at one-third weight' },
            { label: 'Somewhat important', mult: '1.0×', desc: 'Default weight (all questions start here)' },
            { label: 'Very important', mult: '2.5×', desc: 'Question counts at 2.5× weight' },
          ].map(({ label, mult, desc }) => (
            <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${S.cardBorder}`, borderRadius: 8, padding: '16px 18px' }}>
              <p style={{ color: S.gold, fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{mult}</p>
              <p style={{ color: S.text, fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>{label}</p>
              <p style={{ color: S.muted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>

        <p style={{ color: S.muted, fontSize: 14, lineHeight: 1.7 }}>
          A voter who marks healthcare as "Very important" and foreign policy as "Not a priority" will receive a fundamentally different match score than a voter who weights all issues equally — even if their raw answers are identical. This is intentional: the score should reflect what you actually care about, not a flat average.
        </p>
      </Section>

      {/* What we don't do */}
      <Section bg={S.dark}>
        <Overline>What We Don't Do</Overline>
        <h2 style={{ color: S.text, fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 32, letterSpacing: '-0.02em' }}>
          Design choices that protect neutrality
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['Party labels never shown', 'Candidate party affiliations are stored in the database but are never displayed during the quiz or on the results page. You see names and scores only.'],
            ['No demographic profiling', 'We do not collect or infer demographic information. Your answers are not used to classify you politically or target you with content.'],
            ['No A/B testing on question framing', 'Every voter in a given race sees the same bias-audited question set. We do not test different framings on different users.'],
            ['No advertiser relationships', 'GroundedVote is funded by individual donations and foundation grants. No candidate, party, PAC, or advertiser pays to influence what questions are shown or how candidates are scored.'],
            ['Positions are never manually overridden', 'Once the AI pipeline assigns a candidate\'s position, it can only be updated by re-running the pipeline on new source data. No human editor adjusts scores.'],
          ].map(([title, desc]) => (
            <div key={title} style={{ padding: '18px 0', borderBottom: `1px solid rgba(216,171,105,0.07)` }}>
              <p style={{ color: S.text, fontSize: 14, fontWeight: 700, margin: '0 0 5px' }}>
                <span style={{ color: S.teal, marginRight: 8 }}>✓</span>{title}
              </p>
              <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.65, margin: 0, paddingLeft: 22 }}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Limitations */}
      <Section>
        <Overline>Known Limitations</Overline>
        <h2 style={{ color: S.text, fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>
          What GroundedVote cannot guarantee
        </h2>
        <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
          We are committed to honest limitations disclosure.
        </p>
        {[
          ['Challengers have less of a paper trail', 'Official records only exist for current and former members of Congress. For challengers who haven\'t held federal office, we work from public statements and party platforms — and we tell you when that\'s happening, with a lower confidence score.'],
          ['AI scoring is an estimate, not a verdict', 'Even with strong sources, AI-assigned positions are our best read — not a confirmed statement from the candidate. Use it as one signal, not the whole picture. We show you the confidence level so you can judge.'],
          ['We cover competitive federal races, not every race', 'For 2026 we track 35 Senate and House races chosen for electoral competitiveness. State legislature, judicial, and local races aren\'t there yet. We\'re working on it.'],
          ['We reduce bias. We can\'t eliminate it.', 'The three-pass audit catches a lot. It doesn\'t catch everything. The questions are cleaner than what you\'d find anywhere else — but they\'re not perfect. Nothing is.'],
        ].map(([title, desc]) => (
          <div key={title} style={{ padding: '16px 0', borderBottom: `1px solid rgba(216,171,105,0.07)` }}>
            <p style={{ color: S.text, fontSize: 14, fontWeight: 700, margin: '0 0 5px' }}>{title}</p>
            <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{desc}</p>
          </div>
        ))}
      </Section>

      {/* CTA */}
      <Section bg={S.dark} style={{ textAlign: 'center' }}>
        <p style={{ color: S.gold, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          Ready to see your results?
        </p>
        <h2 style={{ color: S.text, fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 20, letterSpacing: '-0.02em' }}>
          Take the quiz
        </h2>
        <p style={{ color: S.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 32, maxWidth: 420, margin: '0 auto 32px' }}>
          Your address. Your races. Your priorities. No party labels.
        </p>
        <a href="/align" style={{ display: 'inline-block', backgroundColor: S.gold, color: '#0F1B1F', padding: '16px 40px', borderRadius: 6, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
          Find My Match →
        </a>
      </Section>
    </>
  )
}
