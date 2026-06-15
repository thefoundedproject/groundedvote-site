import { NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit'

export async function POST(request) {
  const limited = applyRateLimit(request, 'contact', 3, 3600) // 3/hr per IP
  if (limited) return limited

  try {
    const body = await request.json();
    const { name, email, organization, contactType, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GroundedVote <contact@groundedvote.com>',
        to: ['docthompsondacmdc@gmail.com'],
        reply_to: email,
        subject: `[GroundedVote] ${contactType || 'Inquiry'} — ${name}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#0F1B1F;color:#F5F0E8;">
            <div style="border-bottom:2px solid #D8AB69;padding-bottom:16px;margin-bottom:24px;">
              <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D8AB69;margin:0 0 4px;">GroundedVote</p>
              <h1 style="font-size:22px;font-weight:700;margin:0;color:#F5F0E8;">New Contact</h1>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <tr><td style="padding:8px 0;border-bottom:1px solid rgba(216,171,105,0.3);width:140px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#D8AB69;">From</td><td style="padding:8px 0;border-bottom:1px solid rgba(216,171,105,0.3);color:#F5F0E8;">${name}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid rgba(216,171,105,0.3);font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#D8AB69;">Email</td><td style="padding:8px 0;border-bottom:1px solid rgba(216,171,105,0.3);"><a href="mailto:${email}" style="color:#D8AB69;">${email}</a></td></tr>
              ${organization ? `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(216,171,105,0.3);font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#D8AB69;">Organization</td><td style="padding:8px 0;border-bottom:1px solid rgba(216,171,105,0.3);color:#F5F0E8;">${organization}</td></tr>` : ''}
              ${contactType ? `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(216,171,105,0.3);font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#D8AB69;">Role</td><td style="padding:8px 0;border-bottom:1px solid rgba(216,171,105,0.3);color:#F5F0E8;">${contactType}</td></tr>` : ''}
            </table>

            <div style="background:rgba(216,171,105,0.1);border-left:3px solid #D8AB69;padding:16px;border-radius:4px;">
              <p style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#D8AB69;margin:0 0 8px;">Message</p>
              <p style="color:#F5F0E8;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
            </div>

            <p style="font-size:11px;color:rgba(245,240,232,0.5);margin-top:32px;text-align:center;">
              Sent via groundedvote.com · Reply directly to respond to ${name}.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return NextResponse.json({ error: 'Failed to send.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
