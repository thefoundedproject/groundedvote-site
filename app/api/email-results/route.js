/**
 * POST /api/email-results
 * Sends the voter's quiz results to their email via Resend.
 * Body: { email, scores, race }
 */
import { applyRateLimit } from '@/lib/rate-limit'
import { trackEvent, EVENTS } from '@/lib/analytics'

export async function POST(request) {
  const limited = applyRateLimit(request, 'email-results', 3, 3600) // 3/hr per IP
  if (limited) return limited

  try {
    const { email, scores, race } = await request.json()
    if (!email || !scores || !race) {
      return Response.json({ error: 'email, scores, and race required' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json({ error: 'Email service not configured' }, { status: 503 })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const topCandidate = scores[0]
    const electionDate = 'November 3, 2026'

    const getMatchLabel = (score) => {
      if (score >= 80) return 'Strong Match'
      if (score >= 60) return 'Good Match'
      if (score >= 40) return 'Partial Match'
      return 'Low Match'
    }

    const scoreRows = scores.map((c, i) =>
      `<tr style="border-bottom:1px solid #1e3a40;">
        <td style="padding:14px 16px;color:${i===0?'#D8AB69':'#a0b4b8'};font-weight:${i===0?700:400};">
          ${c.candidateName}${i===0?' <span style="font-size:11px;opacity:0.7;">(Closest Match)</span>':''}
        </td>
        <td style="padding:14px 16px;text-align:right;color:${i===0?'#D8AB69':'#a0b4b8'};font-weight:700;font-size:18px;">
          ${c.score}%
        </td>
        <td style="padding:14px 16px;text-align:right;color:#6b8e96;font-size:12px;">
          ${getMatchLabel(c.score)}
        </td>
      </tr>`
    ).join('')

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1214;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1214;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 32px;">
            <p style="color:#D8AB69;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 12px;">
              GroundedVote · Civic Mirror
            </p>
            <h1 style="color:#F5F0E8;font-size:28px;font-weight:300;line-height:1.2;margin:0 0 8px;letter-spacing:-0.02em;">
              Your alignment results
            </h1>
            <p style="color:#6b8e96;font-size:14px;margin:0;">${race.label}</p>
          </td>
        </tr>

        <!-- Scores table -->
        <tr>
          <td style="background:#0f1b1f;border-radius:10px;border:1px solid rgba(216,171,105,0.15);overflow:hidden;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr style="background:rgba(216,171,105,0.06);">
                <th style="padding:12px 16px;text-align:left;color:#6b8e96;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Candidate</th>
                <th style="padding:12px 16px;text-align:right;color:#6b8e96;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Match</th>
                <th style="padding:12px 16px;text-align:right;color:#6b8e96;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Rating</th>
              </tr>
              ${scoreRows}
            </table>
          </td>
        </tr>

        <!-- Spacer -->
        <tr><td style="height:24px;"></td></tr>

        <!-- Methodology note -->
        <tr>
          <td style="background:#0f1b1f;border-radius:8px;border:1px solid rgba(216,171,105,0.1);padding:20px 24px;">
            <p style="color:#6b8e96;font-size:13px;line-height:1.65;margin:0;">
              Your closest match is <strong style="color:#D8AB69;">${topCandidate?.candidateName}</strong> at <strong style="color:#D8AB69;">${topCandidate?.score}%</strong>. 
              This score was weighted by the issue priorities you set during the quiz. 
              No party labels were shown. Your results reflect your stated positions only.
            </p>
          </td>
        </tr>

        <!-- Spacer -->
        <tr><td style="height:24px;"></td></tr>

        <!-- CTA -->
        <tr>
          <td style="text-align:center;padding:8px 0 32px;">
            <a href="https://groundedvote.com/align" style="display:inline-block;background:#D8AB69;color:#0F1B1F;padding:14px 32px;border-radius:6px;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:0.02em;">
              Check another race →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid rgba(216,171,105,0.1);padding:24px 0 0;">
            <p style="color:#3a5a64;font-size:11px;margin:0 0 6px;">
              GroundedVote is a product of The Founded Project LLC · Minneapolis, MN
            </p>
            <p style="color:#3a5a64;font-size:11px;margin:0;">
              <a href="https://groundedvote.com/methodology" style="color:#5a8a96;text-decoration:none;">Read our methodology</a>
              &nbsp;·&nbsp;
              <a href="https://groundedvote.com/support" style="color:#5a8a96;text-decoration:none;">Support the project</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    await resend.emails.send({
      from: 'GroundedVote <results@groundedvote.com>',
      to: email,
      subject: `Your civic alignment: ${topCandidate?.candidateName} ${topCandidate?.score}% — ${race.label}`,
      html,
    })

    await trackEvent(EVENTS.RESULTS_EMAILED, { metadata: { race: race?.label } })
    return Response.json({ sent: true })
  } catch (err) {
    console.error('Email results error:', err)
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
