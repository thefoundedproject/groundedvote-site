import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 300

const ACTIVE_STATES = ['AZ','CA','CO','GA','IA','ME','MI','MN','MT','NC','NH','NM','NV','NY','OH','OR','PA','TX','VA','WA','WI']

export async function generateStaticParams() {
  const races = await prisma.race.findMany({ select: { state: true }, distinct: ['state'] })
  return races.map(r => ({ code: r.state.toLowerCase() }))
}

export async function generateMetadata({ params }) {
  const code = params.code.toUpperCase()
  const race = await prisma.race.findFirst({ where: { state: code, year: 2026 }, select: { stateFull: true } })
  const name = race?.stateFull ?? code
  return {
    title: `${name} 2026 Voter Guide | GroundedVote`,
    description: `Nonpartisan voter alignment quiz for ${name}'s 2026 competitive federal races. Find which candidates match your actual policy positions — no party labels.`,
    openGraph: {
      title: `${name} 2026 Voter Guide | GroundedVote`,
      description: `Bias-audited alignment quiz for ${name} Senate and House races. No party labels — just issues.`,
      url: `https://groundedvote.com/states/${params.code}`,
    },
  }
}

async function getStateData(code) {
  const races = await prisma.race.findMany({
    where: { state: code, year: 2026 },
    include: {
      candidates: { select: { id: true, firstName: true, lastName: true, party: true, incumbent: true, photoUrl: true, bioguideId: true } },
      _count: { select: { questions: { where: { auditStatus: 'APPROVED' } } } },
    },
    orderBy: { chamber: 'asc' },
