// © 2025 The Founded Project LLC — All rights reserved.
// TEMPORARY one-shot race data repair — remove after running once.
// Fixes: 5 bogus Senate races, wrong-class senators, open-seat candidates,
//        thin competitive records, duplicate FEC/manual-seed candidates.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SECRET = 'gv-fix-races-2026';

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────

async function deleteRaceCascade(raceId, log) {
  const race = await prisma.race.findUnique({
    where: { id: raceId },
    include: {
      questions:    { select: { id: true } },
      candidates:   { select: { id: true } },
      quizSessions: { select: { id: true } },
    },
  });
  if (!race) { log.push(`  SKIP: race ${raceId} not found`); return; }

  const qIds = race.questions.map(q => q.id);
  const cIds = race.candidates.map(c => c.id);
  const sIds = race.quizSessions.map(s => s.id);

  if (sIds.length) {
    await prisma.userAnswer.deleteMany({ where: { sessionId: { in: sIds } } });
    await prisma.quizResult.deleteMany({ where: { sessionId: { in: sIds } } });
    await prisma.quizSession.deleteMany({ where: { id: { in: sIds } } });
  }
  if (qIds.length) {
    await prisma.userAnswer.deleteMany({ where: { questionId: { in: qIds } } });
    await prisma.candidateAnswer.deleteMany({ where: { questionId: { in: qIds } } });
    await prisma.questionVariant.deleteMany({ where: { questionId: { in: qIds } } });
    await prisma.question.deleteMany({ where: { id: { in: qIds } } });
  }
  if (cIds.length) {
    await prisma.candidateAnswer.deleteMany({ where: { candidateId: { in: cIds } } });
    await prisma.position.deleteMany({ where: { candidateId: { in: cIds } } });
    await prisma.candidate.deleteMany({ where: { id: { in: cIds } } });
  }
  await prisma.race.delete({ where: { id: raceId } });
  log.push(`  Deleted race ${raceId} (${race.isCompetitive ? 'competitive' : 'non-competitive'}): ${qIds.length}q / ${cIds.length}c`);
}

async function deleteCandidateCascade(candidateId, label, log) {
  const cand = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!cand) { log.push(`  SKIP ${label} — not found (may already be deleted)`); return; }
  await prisma.candidateAnswer.deleteMany({ where: { candidateId } });
  await prisma.position.deleteMany({ where: { candidateId } });
  await prisma.candidate.delete({ where: { id: candidateId } });
  log.push(`  Deleted ${cand.firstName} ${cand.lastName} [${candidateId}] — ${label}`);
}

// ─── Route ─────────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const log = [];
  const errors = [];

  try {

    // SECTION 1: Delete 5 bogus Senate races
    // AZ: Kelly (up 2028), Gallego (up 2030)
    // NV: Rosen (up 2030), Cortez Masto (up 2028)
    // OH: Vance (up 2028), Moreno (up 2030)
    // PA: Fetterman (up 2028), McCormick (up 2030)
    // WI: Johnson (up 2028), Hovde (up 2030)
    log.push('=== SECTION 1: Delete bogus Senate races ===');
    const BOGUS_SENATE_STATES = ['AZ', 'NV', 'OH', 'PA', 'WI'];
    for (const state of BOGUS_SENATE_STATES) {
      const races = await prisma.race.findMany({
        where: { state, chamber: 'SENATE', year: 2026 },
      });
      log.push(`${state} Senate: ${races.length} record(s) found`);
      for (const race of races) {
        await deleteRaceCascade(race.id, log);
      }
    }

    // SECTION 2: Remove wrong-class senators from competitive records
    // FEC seeder pulled both senators per state; only one seat is up per state.
    // Keep: Ossoff(GA), Peters(MI), Smith(MN), Daines(MT), Tillis(NC), Cornyn(TX)
    // NH open seat (Shaheen retiring) — remove Hassan
    log.push('=== SECTION 2: Remove wrong-class senators ===');
    const WRONG_SENATORS = [
      { id: 'cmqciteok00051092cs40l4zr', label: 'Raphael G. Warnock — GA, Class 3, up 2028' },
      { id: 'cmqcitiyl001f10921b7tt8gr', label: 'Elissa Slotkin — MI, Class 1, up 2030' },
      { id: 'cmqcitfmb000f1092zhw7ly0h', label: 'Amy Klobuchar — MN, Class 1, up 2030' },
      { id: 'cmqcitfsz000h1092xkj22px6', label: 'Tim Sheehy — MT, Class 1, up 2030' },
      { id: 'cmqcitgd3000n1092d2270k1l', label: 'Ted Budd — NC, Class 3, up 2028' },
      { id: 'cmqcitgqg000r1092hireqwp0', label: 'Margaret Wood Hassan — NH, Class 3, up 2028' },
      { id: 'cmqcitnlj002t10925rq4n5sd', label: 'Ted Cruz — TX, Class 1, up 2030' },
    ];
    for (const { id, label } of WRONG_SENATORS) {
      await deleteCandidateCascade(id, label, log);
    }

    // SECTION 3: Fix AZ-1 open seat (Schweikert running for governor)
    // D frontrunner: Amish Shah (ER physician, led 2024 race, leads D primary 3:1)
    log.push('=== SECTION 3: Fix AZ-1 open seat ===');
    await prisma.candidate.update({
      where: { id: 'cmqcitoc500311092mwxa66b4' },
      data: { incumbent: false },
    });
    log.push('  Updated Schweikert: incumbent → false (vacating for governor race)');

    const amishShah = await prisma.candidate.create({
      data: {
        raceId: 'cmqak4zxg000tmtkskczm4o0r',
        firstName: 'Amish',
        lastName: 'Shah',
        party: 'DEMOCRAT',
        incumbent: false,
      },
    });
    log.push(`  Added Amish Shah (D) → AZ-1 competitive [${amishShah.id}]`);

    // SECTION 4: Seed missing opponents in thin competitive records
    // Manual seed ran against non-competitive records for CA-13 + CA-27
    // AZ-6 competitive never got a D challenger
    log.push('=== SECTION 4: Seed missing opponents ===');

    const lincoln = await prisma.candidate.create({
      data: {
        raceId: 'cmqak3xak000mmtksn0lld9b7',
        firstName: 'Kevin',
        lastName: 'Lincoln',
        party: 'REPUBLICAN',
        incumbent: false,
      },
    });
    log.push(`  Added Kevin Lincoln (R) → CA-13 competitive [${lincoln.id}]`);

    const gibbs = await prisma.candidate.create({
      data: {
        raceId: 'cmqak5l9j000wmtkscm7j6xmj',
        firstName: 'Jason',
        lastName: 'Gibbs',
        party: 'REPUBLICAN',
        incumbent: false,
      },
    });
    log.push(`  Added Jason Gibbs (R) → CA-27 competitive [${gibbs.id}]`);

    const mendoza = await prisma.candidate.create({
      data: {
        raceId: 'cmqak3piv000kmtksy09gnlns',
        firstName: 'JoAnna',
        lastName: 'Mendoza',
        party: 'DEMOCRAT',
        incumbent: false,
      },
    });
    log.push(`  Added JoAnna Mendoza (D) → AZ-6 competitive [${mendoza.id}]`);

    // SECTION 5: Remove duplicate candidates
    // FEC seeder used formal names; manual seed used common names.
    // Also removes one malformed FEC parse in MI-7.
    log.push('=== SECTION 5: Remove duplicate candidates ===');
    const DUPLICATES = [
      { id: 'cmqcitrby003x1092d04l20b2', label: 'OR-5 "Janelle S. Bynum" → keep "Janelle Bynum"' },
      { id: 'cmqcitrpb00411092guyow5cn', label: 'PA-8 "Robert P. Bresnahan" → keep "Rob Bresnahan"' },
      { id: 'cmqcits2s0045109267jaeset',  label: 'VA-2 "Jennifer A. Kiggans" → keep "Jennifer Kiggans"' },
      { id: 'cmqcits9f004710927kjmfnhv',  label: 'VA-7 "Eugene Simon Vindman" → keep "Eugene Vindman"' },
      { id: 'cmqmfcalc002hp3d22mgehyw1',  label: 'IA-3 "Zach Nunn" → keep "Zachary Nunn"' },
      { id: 'cmqcitpng003f1092saegzts9',  label: 'ME-2 "Jared F. Golden" → keep "Jared Golden"' },
      { id: 'cmqmfce5i0033p3d2l70ueosl',  label: 'MI-7 "Thomas Barrett" → keep "Tom Barrett"' },
      { id: 'cmqmfce950035p3d2hyqzjrry',  label: 'MI-7 malformed parse — firstName "," lastName "Brink"' },
      { id: 'cmqmfcgl8003rp3d2xcz8a3u0',  label: 'MN-2 "Angela Craig" → keep "Angie Craig"' },
      { id: 'cmqmfciwf004dp3d25ostu109',   label: 'NM-2 "Gabriel Vasquez" → keep "Gabe Vasquez"' },
    ];
    for (const { id, label } of DUPLICATES) {
      await deleteCandidateCascade(id, label, log);
    }

  } catch (err) {
    errors.push(err.message);
    console.error('fix-races-2026 error:', err);
  }

  return NextResponse.json({ success: errors.length === 0, log, errors });
}
