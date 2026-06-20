// © 2025 The Founded Project LLC — All rights reserved.
// TEMPORARY one-shot seed route — remove after running once.
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const SECRET = 'gv-seed-mn-2026';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const race = await prisma.race.findFirst({
    where: { state: 'MN', chamber: 'SENATE', year: 2026 },
    include: { candidates: true },
  });
  if (!race) return NextResponse.json({ error: 'MN Senate 2026 race not found' }, { status: 404 });

  const log = [];

  // Remove Klobuchar (Class 3 — not up until 2030)
  const klobuchar = race.candidates.find(c =>
    c.lastName === 'Klobuchar' || (c.firstName === 'Amy' && c.lastName === 'Klobuchar')
  );
  if (klobuchar) {
    await prisma.candidate.delete({ where: { id: klobuchar.id } });
    log.push('removed Klobuchar');
  }

  // Mark Tina Smith non-incumbent (retiring)
  const smith = race.candidates.find(c =>
    c.lastName === 'Smith' && c.firstName === 'Tina'
  );
  if (smith) {
    await prisma.candidate.update({ where: { id: smith.id }, data: { incumbent: false } });
    log.push('marked Tina Smith non-incumbent');
  }

  // Seed Republicans
  const republicans = [
    { firstName: 'Joe', lastName: 'Fraser' },
    { firstName: 'Scott', lastName: 'Jensen' },
    { firstName: 'Tom', lastName: 'Emmer' },
    { firstName: 'Pete', lastName: 'Stauber' },
    { firstName: 'Brad', lastName: 'Finstad' },
    { firstName: 'Tyler', lastName: 'Kistner' },
    { firstName: 'Joe', lastName: 'Manchik' },
    { firstName: 'Dan', lastName: 'Feehan' },
    { firstName: 'Harry', lastName: 'Pennington' },
    { firstName: 'Mark', lastName: 'Weaver' },
  ];

  // Seed DFL challengers
  const dfl = [
    { firstName: 'Melissa', lastName: 'Hortman' },
    { firstName: 'Mindy', lastName: 'Greiling' },
    { firstName: 'Erik', lastName: 'Paulsen' },
  ];

  const existingNames = race.candidates.map(c => `${c.firstName} ${c.lastName}`);

  for (const c of republicans) {
    const name = `${c.firstName} ${c.lastName}`;
    if (!existingNames.includes(name)) {
      await prisma.candidate.create({
        data: {
          raceId: race.id,
          firstName: c.firstName,
          lastName: c.lastName,
          party: 'REPUBLICAN',
          incumbent: false,
        },
      });
      log.push(`added R: ${name}`);
    } else {
      log.push(`skipped (exists): ${name}`);
    }
  }

  for (const c of dfl) {
    const name = `${c.firstName} ${c.lastName}`;
    if (!existingNames.includes(name)) {
      await prisma.candidate.create({
        data: {
          raceId: race.id,
          firstName: c.firstName,
          lastName: c.lastName,
          party: 'DEMOCRAT',
          incumbent: false,
        },
      });
      log.push(`added DFL: ${name}`);
    } else {
      log.push(`skipped (exists): ${name}`);
    }
  }

  return NextResponse.json({ success: true, raceId: race.id, log });
}
