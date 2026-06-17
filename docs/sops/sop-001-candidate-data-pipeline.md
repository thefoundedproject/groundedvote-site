# SOP-001: Candidate Data Pipeline
**GroundedVoteâ¢ â Operational Standard Operating Procedure**
**Version 1.0 â June 2026**
**Proprietary and Confidential â Â© 2025 The Founded Project LLC**

---

## Purpose

This document defines the step-by-step process for extracting, scoring, and storing candidate ideological positions in GroundedVote. It covers the full evidence pipeline from VoteSmart through Ballotpedia to AI inference, and establishes quality standards for every data source.

---

## Scope

Applies to: all GroundedVote races, candidates, and quiz questions. Performed by: authorized contributors to the `groundedvote-site` repository. Environment: Railway (production), Supabase PostgreSQL.

---

## 1. Evidence Quality Hierarchy

Always use the highest-quality available source. Never substitute a lower tier when a higher tier has data.

| Tier | Source | Evidence Type | Confidence Range | Notes |
|------|--------|---------------|-----------------|-------|
| 1 | VoteSmart Political Courage Test (PCT) | `VOTESMART_PCT` | 0.90 â 0.98 | Self-reported by candidate. Highest trust. |
| 2 | VoteSmart Interest Group Ratings | `VOTESMART_RATING` | 0.75 â 0.88 | Scored by third-party orgs (ACU, ADA, NRA, etc.) |
| 3 | Congress.gov Voting Record | `VOTING_RECORD` | 0.72 â 0.85 | For incumbents only. Floor votes on relevant bills. |
| 4 | Ballotpedia Profile | `BALLOTPEDIA` | 0.65 â 0.80 | Bio + policy positions extracted from intro text. |
| 5 | Campaign Platform (DB) | `CAMPAIGN_PLATFORM` | 0.55 â 0.70 | Manually entered from campaign website or mailers. |
| 6 | Party Inference | `PARTY_INFERENCE` | 0.30 â 0.50 | Last resort. Shown to voter as transparency signal. |

**Critical rule:** Confidence scores are ceilings, not defaults. If evidence is thin or ambiguous, score conservatively (lower confidence).

---

## 2. Prerequisites

Before running the pipeline for any race or candidate:

1. **VoteSmart API Key** â must be set in Railway Variables as `VOTESMART_API_KEY`. Register free at [api.votesmart.org](http://api.votesmart.org). Without this key, Tiers 1 and 2 are skipped silently.
2. **Database seeded** â race, candidates, and quiz questions must exist in Supabase (`Race`, `Candidate`, `Question` tables).
3. **Candidate fields populated** â `firstName`, `lastName`, `state`, and `party` must be present. `incumbentTitle` and `chamber` recommended for Congress.gov lookups.
4. **Questions linked to race** â `RaceQuestion` join table must have entries mapping questions to the target race.

---

## 3. Running Position Extraction

### 3a. For a Full Race

Call the exported function from `lib/candidate-positions.js`:

```js
import { extractPositionsForRace } from '@/lib/candidate-positions'

// Process all candidates in race ID "race_abc123"
await extractPositionsForRace('race_abc123')

// Force re-score even if positions already exist
await extractPositionsForRace('race_abc123', { overwrite: true })
```

### 3b. For a Single Candidate

```js
import { extractPositionsForCandidate } from '@/lib/candidate-positions'

// Score candidate against all their race's questions
await extractPositionsForCandidate('candidate_xyz789')

// Force overwrite existing scores
await extractPositionsForCandidate('candidate_xyz789', { overwrite: true })
```

### 3c. Via API Route (recommended for production)

POST to `/api/admin/extract-positions` with body:

```json
{ "raceId": "race_abc123" }
// or
{ "candidateId": "candidate_xyz789" }
// optional
{ "overwrite": true }
```

Requires admin authentication. Returns `{ success: true, processed: N }`.

---

## 4. Evidence Pipeline â Step by Step

The `buildCandidateContext()` function executes this chain automatically:

**Step 1 â VoteSmart ID Lookup**
Queries `Candidates.getByLastname` with candidate's last name, matches on first initial + state. Stores VoteSmart candidate ID in memory for subsequent calls.

**Step 2 â VoteSmart PCT**
Calls `Npf.getCandidatePosition` with the VS candidate ID. Returns structured policy positions from the Political Courage Test. If the candidate has not completed a PCT, returns null and falls through.

**Step 3 â VoteSmart Ratings**
Calls `Rating.getCandidateRating`. Filters for priority interest groups (ACU, ADA, AFL-CIO, NFIB, Sierra Club, NRA, NARAL, ACLU, Heritage Action, Club for Growth, US Chamber of Commerce, Planned Parenthood, others). These ratings calibrate left-right ideological positioning.

**Step 4 â Congress.gov (incumbents)**
If `candidate.chamber` is set (`House` or `Senate`), queries Congress.gov for recent votes on bills relevant to each question's topic. Requires `CONGRESS_API_KEY` in Railway Variables.

**Step 5 â Ballotpedia**
Calls the MediaWiki API for the candidate's Ballotpedia article. Extracts first 3,000 characters of intro text. Used for position signals when structured data is absent.

**Step 6 â DB Positions**
If the candidate already has positions stored in the `CandidatePosition` table, those are included as context. This allows manual overrides to persist through re-runs (unless `overwrite: true`).

**Step 7 â AI Scoring**
Sends the assembled evidence context plus the quiz question to the Fable model (high-stakes inference only â per FABLE MODEL RULES). Returns:
- `answerValue` (1â5 scale)
- `confidence` (0.0â1.0)
- `sourceNote` (human-readable evidence citation)
- `evidenceType` (one of the tier codes above)

**Step 8 â Write to DB**
Upserts into `CandidatePosition` table. If `overwrite: false` and a record exists, skips.

---

## 5. Scoring Rules and Anti-Bias Guardrails

### The 1â5 Scale

| Value | Meaning |
|-------|---------|
| 1 | Strongly opposes |
| 2 | Opposes / leans against |
| 3 | Moderate / mixed / uncertain |
| 4 | Supports / leans toward |
| 5 | Strongly supports / has championed |

### Key Guardrails (enforced in AI prompt)

- **Reserve 5 for champions.** A candidate who "supports" something without sponsoring legislation or making it a campaign centerpiece is a 4, not a 5.
- **Reserve 1 for active opponents.** Silence is not opposition. Silence is 3.
- **Moderates with leanings.** A moderate who leans toward supporting with reservations is 3â4, never 5.
- **Party inference is a last resort.** Never infer position from party affiliation when any candidate-specific signal exists.
- **Confidence floors:** Never assign confidence above 0.50 on pure party inference. Show `PARTY_INFERENCE` evidence type to voters as a transparency signal.

---

## 6. Quality Assurance Checklist

After running extraction for a race, verify:

- [ ] All candidates in the race have `CandidatePosition` records for all questions
- [ ] No candidate has all positions at exactly 3 (indicates AI is uncertain and defaulting â investigate data gaps)
- [ ] No candidate has all positions at 1 or all at 5 (indicates evidence bias or data error)
- [ ] Confidence scores are within expected range for the evidence tier used
- [ ] `evidenceType` values reflect the actual sources consumed (spot-check 3â5 records)
- [ ] Incumbents using `PARTY_INFERENCE` warrant manual review â check for Congress.gov data

---

## 7. Manual Override Procedure

When AI-generated scores are incorrect and must be corrected:

1. Open the Supabase dashboard â `CandidatePosition` table
2. Find the record by `candidateId` + `questionId`
3. Update `answerValue` to the correct value (1â5)
4. Set `confidence` to `0.95` (manual review = high confidence)
5. Set `evidenceType` to `CAMPAIGN_PLATFORM` or `VOTING_RECORD` with a note in `sourceNote`
6. Do NOT run `extractPositionsForCandidate` with `overwrite: true` afterward â this will wipe the manual correction

---

## 8. Adding VoteSmart API Key to Railway

1. Navigate to Railway project â **groundedvote-site** service â **Variables** tab
2. Click **New Variable**
3. Name: `VOTESMART_API_KEY`
4. Value: (paste key from VoteSmart developer portal)
5. Click **Add** â Railway redeploys automatically
6. Verify: tail deployment logs for `VoteSmart: connected` message (if logging is enabled)

---

## 9. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| All candidates score at `PARTY_INFERENCE` | `VOTESMART_API_KEY` missing | Add key to Railway Variables |
| VoteSmart returns no match | Name mismatch (nickname vs. legal name) | Add `vsDisplayName` field to Candidate record |
| Ballotpedia returns empty | Candidate has no article | Expected â falls through to next tier |
| AI returns confidence < 0.40 | Evidence is thin or contradictory | Consider manual override |
| `overwrite: false` skips all records | Positions already exist | Pass `overwrite: true` to refresh |
| Congress.gov returns 401 | Missing or expired `CONGRESS_API_KEY` | Renew key at api.congress.gov |

---

*Revision history: v1.0 â June 2026 â initial release*
*Owner: The Founded Project LLC â docthompsondacmdc@gmail.com*
