// © 2025 The Founded Project LLC — All rights reserved.
// TEMPORARY one-shot manual top-up seed — remove after running once.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SECRET = 'gv-fec-seed-2026';

// Confirmed 2026 general election candidates. Sources: Ballotpedia, Cook Political Report — June 2026.
const MANUAL_SEEDS = [
  { state: 'CA', district: '13', candidates: [
    { firstName: 'Adam', lastName: 'Gray', party: 'DEMOCRAT', incumbent: true },
    { firstName: 'Kevin', lastName: 'Lincoln', party: 'REPUBLICAN', incumbent: false },
  ]},
  { state: 'CA', district: '27', candidates: [
    { firstName: 'George', lastName: 'Whitesides', party: 'DEMOCRAT', incumbent: true },
    { firstName: 'Jason', lastName: 'Gibbs', party: 'REPUBLICAN', incumbent: false },
  ]},
  { state: 'OR', district: '5', candidates: [
    { firstName: 'Janelle', lastName: 'Bynum', party: 'DEMOCRAT', incumbent: true },
    { firstName: 'Patti', lastName: 'Adair', party: 'REPUBLICAN', incumbent: false },
  ]},
  { state: 'PA', district: '7', candidates: [
    { firstName: 'Ryan', lastName: 'Mackenzie', party: 'REPUBLICAN', incumbent: true },
    { firstName: 'Bob', lastName: 'Brooks', party: 'DEMOCRAT', incumbent: false },
  ]},
  { state: 'PA', district: '8', candidates: [
    { firstName: 'Rob', lastName: 'Bresnahan', party: 'REPUBLICAN', incumbent: true },
    { firstName: 'Paige', lastName: 'Cognetti', party: 'DEMOCRAT', incumbent: false },
  ]},
  { state: 'TX', district: '28', candidates: [
    { firstName: 'Henry', lastName: 'Cuellar', party: 'DEMOCRAT', incumbent: true },
    { firstName: 'Tano', lastName: 'Tijerina', party: 'REPUBLICAN', incumbent: false },
  ]},
  { state: 'VA', district: '2', candidates: [
    { firstName: 'Jennifer', lastName: 'Kiggans', party: 'REPUBLICAN', incumbent: true },
    { firstName: 'Elaine', lastName: 'Luria', party: 'DEMOCRAT', incumbent: false },
  ]},
  { state: 'VA', district: '7', candidates: [
    { firstName: 'Eugene', lastName: 'Vindman', party: 'DEMOCRAT', incumbent: true },
    { firstName: 'Tara', lastName: 'Durant', party: 'REPUBLICAN', incumbent: false },
  ]},
  { state: 'WA', district: '3', candidates: [
    { firstName: 'Marie', lastName: 'Gluesenkamp Perez', party: 'DEMOCRAT', incumbent: true },
    { firstName: 'John', lastName: 'Braun', party: 'REPUBLICAN', incumbent: false },
  ]},
  { state: 'WI', district: '3', candidates: [
    { firstName: 'Derrick', lastName: 'Van Orden', party: 'REPUBLICAN', incumbent: true },
    { firstName: 'Rebecca', lastName: 'Cooke', party: 'DEMOCRAT', incumbent: false },
  ]},
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const log = [], errors = [];

  for (const seed of MANUAL_SEEDS) {
    try {
      const races = await prisma.race.findMany({
        where: { state: seed.state, chamber: 'HOUSE', district: seed.district, year: 2026 },
        include: { candidates: { select: { firstName: true, lastName: true } } },
      });
      if (!races.length) { errors.push(`${seed.state}-${seed.district}: no race found`); continue; }
      const race = races.sort((a, b) => b.candidates.length - a.candidates.length)[0];
      const seen = new Set(race.candidates.map(c => `${c.firstName} ${c.lastName}`.toLowerCase()));
      for (const cand of seed.candidates) {
        const k = `${cand.firstName} ${cand.lastName}`.toLowerCase();
        if (seen.has(k)) { log.push(`  skip ${seed.state}-${seed.district}: ${cand.firstName} ${cand.lastName}`); continue; }
        await prisma.candidate.create({ data: { raceId: race.id, firstName: cand.firstName, lastName: cand.lastName, party: cand.party, incumbent: cand.incumbent } });
        seen.add(k);
        log.push(`  added ${seed.state}-${seed.district}: ${cand.firstName} ${cand.lastName} (${cand.party})`);
      }
    } catch (err) { errors.push(`${seed.state}-${seed.district}: ${err.message}`); }
  }
  return NextResponse.json({ success: true, log, errors });
}
