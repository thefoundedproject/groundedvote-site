/**
 * POST /api/admin/notify-state
 * Sends a "your state is live" email to all AwarenessLeads for a given state.
 *
 * Body: { stateCode: "MN", stateName: "Minnesota", raceLabels: ["Minnesota Senate 2026"] }
 * Optional: { dryRun: true } — returns recipient list without sending
 */

import { prisma } from '@/lib/prisma'

function isAuthorized(request) {
  const auth = request.headers.get('Authorization')
  return process.env.ADMIN_SECRET && auth === `Bearer ${process.env.ADMIN_SECRET}`
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { stateCode, stateName, raceLabels = [], dryRun = false } = await request.json()
    if (!stateCode || !stateName) {
      return Response.json({ error: 'stateCode and stateName required' }, { status: 400 })
    }

    // Find all un-notified leads for this state
    const leads = await prisma.awarenessLead.findMany({
      where: { notifyState: stateCode, notified: false },
      select: { id: true, email: true },
    })

    if (leads.length === 0) {
      return Response.json({ sent: 0, message: 'No pending leads for this state' })
    }

    if (dryRun) {
      return Response.json({
        dryRun: true,
        recipients: leads.length,
        emails: leads.map(l => l.email),
      })
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const raceList = raceLabels.length > 0
      ? `<ul style="margin:12px 0 0;padding:0 0 0 18px;color:rgba(245,240,232,0.6);font-size:13px;line-height:1.8;">${raceLabels.map(r => `<li>${r}</li>`).join('')}</ul>`
      : ''

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1214;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1214;padding:40px 20px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="padding:0 0 28px;">
      <p style="color:#D8AB69;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 16px;">GroundedVote · 2026 Elections</p>
      <h1 style="color:#F5F0E8;font-size:28px;font-weight:300;line-height:1.2;margin:0 0 12px;letter-spacing:-0.02em;">
        ${stateName} is live.
      </h1>
      <p style="color:rgba(245,240,232,0.5);font-size:15px;line-height:1.7;margin:0;">
        You signed up to be notified when ${stateName} race data was ready. That day is today.
      </p>
    </td></tr>

    <tr><td style="background:#0f1b1f;border-radius:10px;border:1px solid rgba(216,171,105,0.15);padding:24px 28px;margin-bottom:24px;">
      <p style="color:rgba(245,240,232,0.4);font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 8px;">Races now available</p>
      ${raceList || '<p style="color:rgba(245,240,232,0.5);font-size:14px;margin:0;">Competitive federal races in ' + stateName + '</p>'}
    </td></tr>

    <tr><td style="height:24px;"></td></tr>

    <tr><td style="background:#0f1b1f;border-radius:10px;border:1px solid rgba(216,171,105,0.15);padding:24px 28px;">
      <p style="color:#F5F0E8;font-size:15px;font-weight:400;line-height:1.7;margin:0 0 20px;">
        Enter your address on GroundedVote and take the bias-audited alignment quiz. No party labels. No tribal cues. Just your positions matched to theirs.
      </p>
      <a href="https://groundedvote.com/align" style="display:inline-block;background:#D8AB69;color:#0F1B1F;padding:14px 32px;border-radius:6px;font-weight:700;font-size:14px;text-decoration:none;">
        Find My Match in ${stateName} →
      </a>
    </td></tr>

    <tr><td style="height:32px;"></td></tr>
    <tr><td style="border-top:1px solid rgba(216,171,105,0.1);padding:20px 0 0;">
      <p style="color:#3a5a64;font-size:11px;margin:0 0 6px;">GroundedVote · The Founded Project LLC · Minneapolis, MN</p>
      <p style="color:#3a5a64;font-size:11px;margin:0;">You're receiving this because you signed up for ${stateName} launch notifications.</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body></html>`

    // Send in batches of 50
    const BATCH = 50
    let sent = 0
    let failed = 0

    for (let i = 0; i < leads.length; i += BATCH) {
      const batch = leads.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map(lead =>
          resend.emails.send({
            from: 'GroundedVote <notify@groundedvote.com>',
            to: lead.email,
            subject: `${stateName} is live on GroundedVote — take the quiz`,
            html,
          })
        )
      )

      const successIds = []
      results.forEach((r, j) => {
        if (r.status === 'fulfilled') {
          sent++
          successIds.push(batch[j].id)
        } else {
          failed++
        }
      })

      // Mark notified
      if (successIds.length > 0) {
        await prisma.awarenessLead.updateMany({
          where: { id: { in: successIds } },
          data: { notified: true },
        })
      }
    }

    return Response.json({ sent, failed, total: leads.length })
  } catch (err) {
    console.error('Notify-state error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// GET — preview pending recipients for a state
export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const stateCode = searchParams.get('state')

  const where = stateCode
    ? { notifyState: stateCode, notified: false }
    : { notifyState: { not: null }, notified: false }

  const leads = await prisma.awarenessLead.findMany({
    where,
    select: { notifyState: true },
  })

  // Count by state
  const counts = {}
  for (const l of leads) {
    counts[l.notifyState] = (counts[l.notifyState] ?? 0) + 1
  }

  return Response.json({ pending: counts, total: leads.length })
}
