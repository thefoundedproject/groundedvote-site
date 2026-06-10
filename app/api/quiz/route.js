import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request) {
  try {
    const { email, answers, profile, notifyState } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Save lead to database
    const profileKey = profile?.title?.includes('already doing') ? 'confident'
      : profile?.title?.includes('values') ? 'partial'
      : profile?.title?.includes('identity') ? 'low'
      : profile?.title?.includes('failed') ? 'disengaged'
      : 'partial'

    await prisma.awarenessLead.create({
      data: {
        email,
        profile: profileKey,
        answers: answers || [],
      },
    }).catch(err => console.error('DB save error (non-fatal):', err))

    // Notify the team
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GroundedVote <quiz@groundedvote.com>',
        to: ['docthompsondacmdc@gmail.com'],
        reply_to: email,
        subject: `[Quiz Lead] ${profile?.title || 'New response'} — ${email}`,
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#0F1B1F;color:#F5F0E8;">
            <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D8AB69;margin:0 0 8px;">GroundedVote — Quiz Lead</p>
            <h2 style="color:#F5F0E8;margin:0 0 24px;font-size:20px;">${profile?.title || 'New quiz response'}</h2>
            <p style="color:#D8AB69;font-size:13px;margin:0 0 4px;">Email</p>
            <p style="color:#F5F0E8;margin:0 0 20px;">${email}</p>
            <p style="color:#D8AB69;font-size:13px;margin:0 0 8px;">Answers</p>
            ${(answers || []).map(a => `<p style="color:#F5F0E8;margin:0 0 8px;font-size:14px;"><strong style="color:#D8AB69;">${a.q}</strong><br>${a.a}</p>`).join('')}
          </div>
        `,
      }),
    }).catch(err => console.error('Team notify error:', err))

    // Send user their profile — only for completed quiz
    if (answers && answers.length > 0) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GroundedVote <hello@groundedvote.com>',
          to: [email],
          subject: `Your GroundedVote profile: ${profile?.title || 'Your results'}`,
          html: `
            <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#0F1B1F;color:#F5F0E8;">
              <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D8AB69;margin:0 0 16px;">GroundedVote</p>
              <h1 style="color:#F5F0E8;font-size:28px;font-weight:300;margin:0 0 8px;">${profile?.title || 'Your profile'}</h1>
              <p style="color:#F5F0E8;line-height:1.7;margin:0 0 16px;">${profile?.desc || ''}</p>
              <p style="color:rgba(245,240,232,0.6);line-height:1.7;margin:0 0 24px;border-left:2px solid #D8AB69;padding-left:12px;">${profile?.next || ''}</p>
              <a href="https://groundedvote.com/align" style="display:inline-block;background:#D8AB69;color:#0F1B1F;padding:14px 32px;text-decoration:none;font-weight:700;border-radius:4px;margin-right:12px;">Take the Real Quiz</a>
              <a href="https://groundedvote.com/methodology" style="display:inline-block;color:#D8AB69;padding:14px 0;text-decoration:none;font-weight:600;font-size:14px;">Read the methodology →</a>
              <p style="color:rgba(245,240,232,0.3);font-size:11px;margin-top:32px;">GroundedVote · An initiative of RhetoricalPoints LLC · Minneapolis, MN</p>
            </div>
          `,
        }),
      }).catch(err => console.error('User email error:', err))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Quiz API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
