import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ADMIN_SECRET = process.env.ADMIN_SECRET
function auth(req) { return req.headers.get('x-admin-secret') === ADMIN_SECRET }

// GET ?raceId=xxx — fetch all questions for a race with audit status
export async function GET(req) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const raceId = searchParams.get('raceId')
  if (!raceId) return NextResponse.json({ error: 'raceId required' }, { status: 400 })

  const questions = await prisma.question.findMany({
    where: { raceId },
    orderBy: { weight: 'desc' },
    include: { _count: { select: { candidateAnswers: true } } },
  })
  return NextResponse.json(questions)
}

// PATCH — approve, reject, or edit a question
export async function PATCH(req) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, auditStatus, questionText, weight, topic } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const q = await prisma.question.update({
    where: { id },
    data: {
      ...(auditStatus && { auditStatus }),
      ...(questionText && { questionText }),
      ...(weight !== undefined && { weight: Number(weight) }),
      ...(topic && { topic }),
    },
  })
  return NextResponse.json(q)
}

// DELETE — remove a question entirely
export async function DELETE(req) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.question.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
