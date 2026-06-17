# SOP-002: Quiz and Race Management
**GroundedVoteâ¢ â Operational Standard Operating Procedure**
**Version 1.0 â June 2026**
**Proprietary and Confidential â Â© 2025 The Founded Project LLC**

---

## Purpose

This document covers how to add new races, configure quiz questions, manage question weighting, and maintain the quiz data layer in GroundedVote.

---

## 1. Database Schema Overview

The quiz data model:

```
Race
  âââ Candidate[] (many per race)
  âââ RaceQuestion[] â Question (many questions per race)
  âââ UserRaceResult[] (computed after quiz)

Question
  âââ text: string (the question shown to voters)
  âââ weight: float (default 1.0, range 0.5â3.0)
  âââ category: string (e.g., "economy", "immigration", "environment")
  âââ RaceQuestion[] (join to races this question appears in)

CandidatePosition
  âââ candidateId â Candidate
  âââ questionId â Question
  âââ answerValue: int (1â5)
  âââ confidence: float (0â1)
  âââ evidenceType: string
  âââ sourceNote: string
```

---

## 2. Adding a New Race

### Step 1 â Create the Race record

Via Supabase dashboard or seed script:

```js
await prisma.race.create({
  data: {
    name: 'U.S. Senate â Georgia 2026',
    state: 'GA',
    chamber: 'Senate',
    electionDate: new Date('2026-11-03'),
    isActive: true,
  }
})
```

### Step 2 â Create Candidate records

```js
await prisma.candidate.createMany({
  data: [
    {
      raceId: race.id,
      firstName: 'Jane',
      lastName: 'Smith',
      party: 'Democrat',
      isIncumbent: true,
      incumbentTitle: 'U.S. Senator',
      chamber: 'Senate',
      state: 'GA',
    },
    {
      raceId: race.id,
      firstName: 'John',
      lastName: 'Doe',
      party: 'Republican',
      isIncumbent: false,
      state: 'GA',
    },
  ]
})
```

**Incumbent flag** â `isIncumbent: true` triggers the incumbent badge in the UI and enables Congress.gov voting record lookups.

### Step 3 â Link questions to the race

```js
await prisma.raceQuestion.createMany({
  data: questionIds.map(qId => ({
    raceId: race.id,
    questionId: qId,
  }))
})
```

### Step 4 â Run position extraction

```js
await extractPositionsForRace(race.id)
```

### Step 5 â QA and activate

Run the QA checklist from SOP-001 Section 6. Once verified, confirm `isActive: true` in the Race record.

---

## 3. Creating Quiz Questions

### Question design principles

- Questions must be answerable on a 1â5 agree/disagree scale by both voters AND candidates
- Questions must be specific enough that a candidate's actual record can be scored against them
- Avoid compound questions -- split into two questions
- Avoid leading language -- test with someone who disagrees with you

### Weight assignment

Default weight is 1.0. Adjust using the weight field:

- 0.5: Ancillary or proxy issues with indirect policy impact
- 1.0: Standard policy question
- 1.5: High-salience issue with direct legislative consequences
- 2.0: Defining issue for the specific race/region
- 3.0: Reserved for constitutional/structural questions (rare)

Note: Question weight is multiplied by the user's importance rating (1x-3x) and the discriminative multiplier (1.0x-2.0x) at scoring time. A question with weight 2.0 where candidates are maximally split and the user rates it very important can reach 12x effective weight. Use high weights intentionally.

### Discriminative weighting (automatic)

The scoring engine automatically applies discriminativeMult = 1 + spread / 4 where spread is the range between lowest and highest candidate answers in the race. You do not need to set this manually. It rewards questions that genuinely differentiate candidates.

---

## 4. Updating Question Weights Mid-Cycle

If a question's real-world salience changes (e.g. a major news event):

1. Update the weight field in the Question table via Supabase
2. Do not re-run position extraction -- candidate scores do not change
3. Re-run any cached match scores for active users if applicable

---

## 5. Managing the Incumbent Badge

The incumbent badge appears in the UI when candidate.isIncumbent === true. To update:

- Newly elected official: set isIncumbent: true, populate incumbentTitle
- Term-limited or defeated: set isIncumbent: false for the new race cycle
- Special elections: add as new Candidate record with isIncumbent: false unless appointed incumbent

---

## 6. Adding a New State or Local Race

State and local races follow the same schema. Key differences:

- chamber should be set to the office type (e.g. Governor, State Senate, Mayor, School Board)
- VoteSmart coverage varies by state -- lower tiers may be primary sources
- Congress.gov is irrelevant -- omit House/Senate chamber values to avoid spurious lookups
- Questions should be adapted for state-level jurisdiction where relevant

---

## 7. Archiving Completed Races

After an election:

1. Set race.isActive = false in Supabase
2. Leave all CandidatePosition and UserRaceResult records intact (needed for audit trail)
3. The race will no longer appear in the active quiz flow

Do not delete race data. Historical records support the bias audit framework.

---

*Revision history: v1.0 -- June 2026 -- initial release*
*Owner: The Founded Project LLC -- docthompsondacmdc@gmail.com*
