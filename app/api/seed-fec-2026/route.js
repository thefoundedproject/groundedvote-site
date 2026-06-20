// © 2025 The Founded Project LLC — All rights reserved.
// TEMPORARY one-shot FEC seed route — remove after running once.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SECRET = 'gv-fec-seed-2026';
const FEC_KEY = process.env.FEC_API_KEY || 'DEMO_KEY';
const FEC_BASE = 'https://api.open.fec.gov/v1/candidates';

const PARTY_MAP = { REP: 'REPUBLICAN', DEM: 'DEMOCRAT', DFL: 'DEMOCRAT', IND: 'INDEPENDENT', GRN: 'GREEN', LIB: 'LIBERTARIAN' };

function parseName(fecName) {
  const comma = fecName.indexOf(',');
  if (comma === -1) return { firstName: '', lastName: fecName.trim() };
  const last = fecName.slice(0, comma).trim();
  const rest = fecName.slice(comma + 1).trim();
  const first = rest.split(' ').filter(Boolean)[0] || '';
  const tc = s => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
  return { firstName: tc(first), lastName: tc(last) };
}

async function fetchFec(state, office, district) {
  const p = new URLSearchParams({ api_key: FEC_KEY, election_year: '2026', office, state, per_page: '100', page: '1' });
  if (district) p.set('district', String(district).padStart(2, '0'));
  const res = await fetch(`${FEC_BASE}?${p}`);
  if (!res.ok) throw new Error(`FEC ${res.status}`);
  return (await res.json()).results || [];
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const log = [], errors = [];
  const races = await prisma.race.findMany({ where: { year: 2026 }, include: { candidates: { select: { firstName: true, lastName: true } } } });

  // Per state+chamber+district, pick race with most candidates
  const raceMap = new Map();
  for (const race of races) {
    const key = `${race.state}-${race.chamber}-${race.district ?? 'null'}`;
    const ex = raceMap.get(key);
    if (!ex || race.candidates.length > ex.candidates.length) raceMap.set(key, race);
  }
  const unique = [...raceMap.values()];
  log.push(`Processing ${unique.length} unique races`);

  const senateByState = new Map(), houseByState = new Map();
  for (const race of unique) {
    const map = race.chamber === 'SENATE' ? senateByState : houseByState;
    if (!map.has(race.state)) map.set(race.state, []);
    map.get(race.state).push(race);
  }

  for (const [state, stateRaces] of senateByState) {
    try {
      await new Promise(r => setTimeout(r, 400));
      const fec = (await fetchFec(state, 'S', null)).filter(c => ['REP','DEM','DFL'].includes(c.party));
      const race = stateRaces.sort((a,b) => b.candidates.length - a.candidates.length)[0];
      const seen = new Set(race.candidates.map(c => `${c.firstName} ${c.lastName}`.toLowerCase()));
      log.push(`${state} Senate: ${fec.length} REP/DEM from FEC`);
      for (const fc of fec) {
        const { firstName, lastName } = parseName(fc.name);
        if (!firstName || !lastName) continue;
        const k = `${firstName} ${lastName}`.toLowerCase();
        if (seen.has(k)) { log.push(`  skip ${state}-S: ${firstName} ${lastName}`); continue; }
        await prisma.candidate.create({ data: { raceId: race.id, firstName, lastName, party: PARTY_MAP[fc.party]||'INDEPENDENT', incumbent: fc.incumbent_challenge==='I' } });
        seen.add(k);
        log.push(`  added ${state}-S: ${firstName} ${lastName} (${PARTY_MAP[fc.party]}, ic=${fc.incumbent_challenge})`);
      }
    } catch(err) { errors.push(`${state} Senate: ${err.message}`); }
  }

  for (const [state, stateRaces] of houseByState) {
    try {
      await new Promise(r => setTimeout(r, 400));
      const fecAll = await fetchFec(state, 'H', null);
      log.push(`${state} House: ${fecAll.length} total FEC`);
      for (const race of stateRaces) {
        const distStr = String(race.district).padStart(2, '0');
        const fec = fecAll.filter(c => c.district === distStr && ['REP','DEM','DFL'].includes(c.party));
        const seen = new Set(race.candidates.map(c => `${c.firstName} ${c.lastName}`.toLowerCase()));
        for (const fc of fec) {
          const { firstName, lastName } = parseName(fc.name);
          if (!firstName || !lastName) continue;
          const k = `${firstName} ${lastName}`.toLowerCase();
          if (seen.has(k)) { log.push(`  skip ${state}-${race.district}: ${firstName} ${lastName}`); continue; }
          await prisma.candidate.create({ data: { raceId: race.id, firstName, lastName, party: PARTY_MAP[fc.party]||'INDEPENDENT', incumbent: fc.incumbent_challenge==='I' } });
          seen.add(k);
          log.push(`  added ${state}-${race.district}: ${firstName} ${lastName} (${PARTY_MAP[fc.party]}, ic=${fc.incumbent_challenge})`);
        }
      }
    } catch(err) { errors.push(`${state} House: ${err.message}`); }
  }

  return NextResponse.json({ success: true, log, errors });
}