# SOP-003: Code Governance and Copyright Protection
**GroundedVoteâ¢ â Operational Standard Operating Procedure**
**Version 1.0 â June 2026**
**Proprietary and Confidential â Â© 2025 The Founded Project LLC**

---

## Purpose

This document establishes the rules for maintaining copyright protection across all GroundedVote source files, running the copyright batch script, managing the Fable model usage policy, and governing code contributions.

---

## 1. Copyright Header Standard

Every `.js` file in `lib/`, `app/api/`, `scripts/`, and `app/page.js` must begin with the following header verbatim:

```js
/**
 * Copyright Â© 2025 The Founded Project LLC
 * All rights reserved. Proprietary and confidential.
 *
 * This source code is the exclusive property of The Founded Project LLC
 * and may not be copied, modified, distributed, or used without explicit
 * written permission from The Founded Project LLC.
 *
 * GroundedVoteâ¢ â A Civic Alignment Engine
 * https://groundedvote.com
 */
```

This header establishes proprietary claim and puts any reader on notice that the code is not open source, not licensed for redistribution, and not available for use outside The Founded Project LLC without written permission.

---

## 2. Running the Copyright Batch Script

When new `.js` files are added to the codebase, run the batch script to apply headers automatically.

### Command

From the repository root:

```bash
node scripts/add-copyright-headers.js
```

### What it does

- Scans all `.js` files in `lib/`, `app/api/`, `scripts/`, and `app/page.js`
- Skips any file that already contains `Copyright Â© 2025 The Founded Project LLC`
- Prepends the full header to any file that does not have it
- Does not modify file content below the header

### When to run

- After adding any new file to `lib/` or `app/api/`
- After scaffolding new API routes
- Before any significant commit that touches multiple files
- As part of the pre-deployment checklist

### Commit the result

After running the script, commit any modified files with message:

```
Apply copyright headers via add-copyright-headers.js
```

---

## 3. Fable Model Usage Policy

The Fable model is a high-quality, higher-cost inference tier. Its use is restricted to prevent unnecessary spend and to preserve quality signal.

### Approved uses (Fable only)

- Candidate position extraction from evidence context (Pass 1 â one-time per candidate/question pair)
- Bias audit question generation
- Conviction tracker analysis
- RhetoricalPoints discourse analysis
- RootedReclaimers community-facing copy (one-time, not at scale)

### Prohibited uses (never use Fable for)

- Email templates
- UI copy
- Admin tool text
- FAQ content
- Data formatting or transformation
- Standard API response generation
- Seed data generation
- Anything that runs repeatedly or at scale without a one-time justification

### Decision test

Before calling Fable, ask: **"Is this a one-time, high-stakes inference where quality directly affects user trust or product integrity?"**

If the answer is no, use the standard model.

---

## 4. Repository Access and Contribution Rules

### Who may commit

Only authorized contributors to `thefoundedproject/groundedvote-site` may commit code. This repository is private.

### Branch policy

All work happens on `main`. No feature branches are required for single-file changes. For multi-file refactors, create a branch and merge via pull request.

### Commit message format

```
[scope]: Short imperative description

Optional body with context.
```

Examples:
```
lib: Add VoteSmart + Ballotpedia evidence pipeline + copyright header
scripts: Add copyright batch header script
docs: Create technical white paper
app/api: Add position extraction endpoint
```

### What NOT to commit

- API keys, environment variables, or secrets
- Files containing personally identifiable voter data
- Third-party code that has not been license-reviewed

---

## 5. Environment Variable Registry

Maintained in Railway Variables. Current required variables:

| Variable | Purpose | Status |
|----------|---------|--------|
| `DATABASE_URL` | Supabase PostgreSQL connection | Active |
| `DIRECT_URL` | Prisma direct connection (no pooler) | Active |
| `NEXTAUTH_SECRET` | Auth session signing | Active |
| `NEXTAUTH_URL` | Auth callback base URL | Active |
| `OPENAI_API_KEY` | AI inference | Active |
| `ANTHROPIC_API_KEY` | Fable model inference | Active |
| `CONGRESS_API_KEY` | Congress.gov voting records | Active |
| `VOTESMART_API_KEY` | VoteSmart PCT + ratings | **Pending â must add** |
| `NEXT_PUBLIC_*` | Any public env vars | As needed |

To add a variable: Railway project â service â Variables tab â New Variable â Add â redeploy automatically.

---

## 6. Pre-Deployment Checklist

Before any production push to Railway:

- [ ] Copyright headers present on all new `.js` files (run `node scripts/add-copyright-headers.js`)
- [ ] No secrets committed to git (`git log --all --full-history -- .env*` should be empty)
- [ ] Railway Variables updated with any new required keys
- [ ] Prisma schema migrated (`npx prisma migrate deploy` if schema changed)
- [ ] Position extraction run for any new races added in this deploy
- [ ] QA checklist from SOP-001 completed for new races

---

## 7. Intellectual Property Statement

All source code, algorithms, scoring methodologies, quiz frameworks, evidence pipelines, and data models in this repository are the exclusive intellectual property of The Founded Project LLC. This includes but is not limited to:

- The weighted cosine similarity scoring algorithm in `lib/matching.js`
- The discriminative question weighting formula
- The six-tier evidence priority chain in `lib/candidate-positions.js`
- The bias audit framework and question generation methodology
- The GroundedVoteâ¢ Civic Alignment Engine architecture

Any use, reproduction, modification, or distribution of this code or methodology without express written permission from The Founded Project LLC is prohibited and may constitute misappropriation of trade secrets under applicable law.

---

*Revision history: v1.0 â June 2026 â initial release*
*Owner: The Founded Project LLC â docthompsondacmdc@gmail.com*
