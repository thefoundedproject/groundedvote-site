// © 2025 The Founded Project LLC — All rights reserved.
// lib/civic-mirror.js
//
// The Civic Mirror (Quiz 1): six onboarding questions and the profile
// derivation shared by the homepage awareness quiz and /onboarding/quiz.
// Q1 sets the conviction factor; Q2 + Q3 set issue salience weights.

export const CIVIC_QUIZ = [
  {
    q: 'In the last election you voted in, how confident were you that your vote matched what you actually believe?',
    key: 'voting_confidence',
    options: [
      { label: 'Very confident \u2014 I researched candidates and positions thoroughly.', value: 'confident' },
      { label: 'Somewhat confident \u2014 I had a general sense but not much depth.', value: 'partial' },
      { label: 'Not confident \u2014 I voted based on party or general feeling.', value: 'low' },
      { label: 'I did not vote. I did not feel like I had enough information.', value: 'disengaged' },
    ],
  },
  {
    q: 'Which issue area matters most to you heading into the 2026 elections?',
    key: 'primary_issue',
    note: 'Your top two choices will shape how your results are scored.',
    options: [
      { label: 'Economic policy \u2014 wages, jobs, cost of living, trade.', value: 'economy' },
      { label: 'Healthcare \u2014 coverage, drug prices, Medicare, Medicaid.', value: 'healthcare' },
      { label: 'Environment and climate \u2014 emissions, energy policy, public lands.', value: 'environment' },
      { label: 'Immigration \u2014 pathways to citizenship, enforcement, border policy.', value: 'immigration' },
    ],
  },
  {
    q: 'Which of these is your second priority?',
    key: 'secondary_issue',
    note: 'These two issues will count extra in your final match score.',
    options: [
      { label: 'Gun policy \u2014 background checks, firearm regulation, public safety.', value: 'guns' },
      { label: 'Taxes and federal spending \u2014 rates, deficits, size of government.', value: 'taxes' },
      { label: 'Foreign policy \u2014 defense budget, military commitments, foreign aid.', value: 'foreign_policy' },
      { label: 'Voting rights and democratic process \u2014 access, elections, accountability.', value: 'democracy' },
    ],
  },
  {
    q: 'When you encounter a political issue you have not thought about before, what is your default move?',
    key: 'info_processing',
    options: [
      { label: 'I research it independently before forming any opinion.', value: 'research' },
      { label: 'I listen to trusted people in my community or network first.', value: 'community' },
      { label: 'I default to my general political leanings and move on.', value: 'partisan' },
      { label: 'I avoid it \u2014 most political content feels too loaded to engage with honestly.', value: 'avoidance' },
    ],
  },
  {
    q: 'When you evaluate a candidate, what do you trust most?',
    key: 'trust_signal',
    options: [
      { label: 'Their actual voting record \u2014 what they did when it counted, not what they say now.', value: 'record' },
      { label: 'The organizations and donors who fund their campaigns.', value: 'funding' },
      { label: 'Their stated platform and policy positions.', value: 'platform' },
      { label: 'How they perform when questioned directly under pressure.', value: 'performance' },
    ],
  },
  {
    q: 'What would it mean for your life if you voted and knew \u2014 with confidence \u2014 that your vote matched what you actually believe?',
    key: 'alignment_meaning',
    options: [
      { label: 'It would make voting feel like a deliberate act instead of a performance.', value: 'meaningful' },
      { label: 'It would give me confidence I have not had at the ballot box before.', value: 'confidence' },
      { label: 'It would break the cycle of voting out of fear instead of belief.', value: 'cycle' },
      { label: 'Honestly \u2014 it would change how I feel about whether democracy can work.', value: 'democracy' },
    ],
  },
]


export function deriveProfile(answers) {
  const scores = { confident: 0, partial: 0, low: 0, disengaged: 0 }

  // Q1 \u2014 voting confidence (weight 4 \u2014 primary signal)
  const q1 = answers[0]?.value
  if (q1 === 'confident') scores.confident += 4
  else if (q1 === 'partial') scores.partial += 4
  else if (q1 === 'low') scores.low += 4
  else if (q1 === 'disengaged') scores.disengaged += 4

  // Q2 + Q3 \u2014 issue priorities \u2014 extracted separately, not scored for profile

  // Q4 \u2014 info processing (weight 2)
  const q4 = answers[3]?.value
  if (q4 === 'research') scores.confident += 2
  else if (q4 === 'community') scores.partial += 2
  else if (q4 === 'partisan') scores.low += 2
  else if (q4 === 'avoidance') scores.disengaged += 2

  // Q5 \u2014 trust signal (weight 1)
  const q5 = answers[4]?.value
  if (q5 === 'record') scores.confident += 1
  else if (q5 === 'funding') scores.partial += 1
  else if (q5 === 'platform') scores.partial += 1
  else if (q5 === 'performance') scores.low += 1

  // Q6 \u2014 alignment meaning (weight 1)
  const q6 = answers[5]?.value
  if (q6 === 'meaningful') scores.partial += 1
  else if (q6 === 'confidence') scores.low += 1
  else if (q6 === 'cycle') scores.low += 1
  else if (q6 === 'democracy') scores.disengaged += 1

  const profileKey = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]

  // Extract issue priorities from Q2 and Q3
  const issuePriorities = [
    answers[1]?.value,
    answers[2]?.value,
  ].filter(Boolean)

  return { profileKey, issuePriorities }
}

// Conviction factor from Q1 — how firmly the user holds current positions.
// Multiplies issue weights when Quiz 2 answers are scored.
export const CONVICTION_FACTOR = {
  confident: 1.0,
  partial: 0.85,
  low: 0.7,
  disengaged: 0.6,
}

// Issue salience weights from Q2 (primary) and Q3 (secondary).
export function deriveIssueWeights(answers) {
  const weights = {}
  const primary = answers[1]?.value
  const secondary = answers[2]?.value
  if (primary) weights[primary] = 1.0
  if (secondary) weights[secondary] = 0.75
  return weights
}
