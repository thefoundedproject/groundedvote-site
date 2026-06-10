/**
 * The Founded Project LLC — Stripe Webhook Handler
 *
 * Handles all Stripe events for all Founded apps.
 * Single endpoint registered in Stripe dashboard.
 *
 * Register at: https://dashboard.stripe.com/webhooks
 * URL: https://groundedvote.com/api/webhooks/stripe
 *
 * Events to enable:
 *   checkout.session.completed
 *   invoice.paid
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   payment_intent.payment_failed
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, constructWebhookEvent, FOUNDED_APPS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Disable body parsing — Stripe needs the raw body for signature verification
export const config = { api: { bodyParser: false } }

export async function POST(request) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  let event
  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      default:
        // Unhandled event — log and return 200 so Stripe doesn't retry
        console.log(`Unhandled Stripe event: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─── HANDLERS ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session) {
  const { app, product, entity } = session.metadata || {}
  if (!app || !product) return

  const appConfig = FOUNDED_APPS[app]
  const productConfig = appConfig?.products[product]
  if (!appConfig || !productConfig) return

  const email = session.customer_email || session.customer_details?.email
  const amountCents = session.amount_total || 0

  // Ensure Stripe customer record exists
  let customer = null
  if (session.customer && email) {
    customer = await prisma.stripeCustomer.upsert({
      where: { email },
      create: { email, stripeCustomerId: session.customer },
      update: { stripeCustomerId: session.customer },
    })
  }

  // Record the payment
  const payment = await prisma.payment.upsert({
    where: { stripeSessionId: session.id },
    create: {
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent || null,
      stripeCustomerId: customer?.id || null,
      app,
      product,
      entity: entity || 'The Founded Project LLC',
      amountCents,
      status: 'paid',
      email,
      metadata: session.metadata,
    },
    update: { status: 'paid', stripePaymentIntentId: session.payment_intent || null },
  })

  // If this is an API credit purchase, provision the key
  const credits = productConfig.credits
  if (credits && email) {
    await provisionApiCredits({ email, app, credits, paymentId: payment.id, customerId: customer?.id })
  }

  // Send confirmation email
  await sendConfirmationEmail({ email, app, product, amountCents, appConfig, productConfig, credits })

  console.log(`✓ Payment recorded: ${app}.${product} — $${(amountCents / 100).toFixed(2)} — ${email}`)
}

async function handleInvoicePaid(invoice) {
  // Subscription renewal — top up API credits if applicable
  if (!invoice.subscription) return

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const { app, product } = subscription.metadata || {}
  if (!app || !product) return

  const appConfig = FOUNDED_APPS[app]
  const productConfig = appConfig?.products[product]
  const monthlyCredits = productConfig?.creditsPerMonth

  if (monthlyCredits) {
    const email = invoice.customer_email
    const customer = email ? await prisma.stripeCustomer.findUnique({ where: { email } }) : null
    if (email) {
      await provisionApiCredits({
        email, app, credits: monthlyCredits, paymentId: null,
        customerId: customer?.id || null,
        description: `Monthly subscription renewal — ${productConfig.name}`,
      })
      console.log(`✓ Monthly credits topped up: ${app} — ${monthlyCredits} credits — ${email}`)
    }
  }
}

async function handleSubscriptionUpsert(sub) {
  const { app, product, entity } = sub.metadata || {}
  if (!app) return

  const customer = await stripe.customers.retrieve(sub.customer)
  const email = customer.email

  let stripeCustomer = null
  if (email) {
    stripeCustomer = await prisma.stripeCustomer.upsert({
      where: { email },
      create: { email, stripeCustomerId: sub.customer },
      update: { stripeCustomerId: sub.customer },
    })
  }

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: stripeCustomer?.id || (await ensureCustomer(sub.customer, email)).id,
      app,
      product: product || 'unknown',
      entity: entity || 'The Founded Project LLC',
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      email,
      metadata: sub.metadata,
    },
    update: {
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  })

  console.log(`✓ Subscription ${sub.status}: ${app} — ${email}`)
}

async function handleSubscriptionDeleted(sub) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: 'canceled' },
  })
  console.log(`✓ Subscription canceled: ${sub.id}`)
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function ensureCustomer(stripeCustomerId, email) {
  if (!email) {
    return prisma.stripeCustomer.upsert({
      where: { stripeCustomerId },
      create: { email: `unknown-${stripeCustomerId}@stripe.com`, stripeCustomerId },
      update: {},
    })
  }
  return prisma.stripeCustomer.upsert({
    where: { email },
    create: { email, stripeCustomerId },
    update: { stripeCustomerId },
  })
}

/**
 * Provision API credits for a customer.
 * Creates an API key if they don't have one for this app, or tops up existing.
 */
async function provisionApiCredits({ email, app, credits, paymentId, customerId, description }) {
  // Find existing active key for this app + email
  let apiKey = await prisma.apiKey.findFirst({
    where: { email, app, active: true },
  })

  if (!apiKey) {
    // Generate a new key: fp_live_<32 random hex chars>
    const rawKey = `fp_live_${crypto.randomBytes(16).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 12) // fp_live_xxxx

    apiKey = await prisma.apiKey.create({
      data: {
        key: keyHash,
        keyPrefix,
        app,
        email,
        stripeCustomerId: customerId || null,
        creditBalance: 0,
        totalCredits: 0,
      },
    })

    // TODO: email the user their raw key — only time it's shown
    // rawKey should be emailed here, never stored
    console.log(`  New API key created for ${email} (${app}): ${keyPrefix}****`)
  }

  // Add credits
  const newBalance = apiKey.creditBalance + credits

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      creditBalance: newBalance,
      totalCredits: { increment: credits },
    },
  })

  await prisma.apiKeyTransaction.create({
    data: {
      apiKeyId: apiKey.id,
      type: 'credit',
      amount: credits,
      balance: newBalance,
      description: description || `${credits} credits purchased`,
      paymentId: paymentId || null,
    },
  })

  return apiKey
}

async function sendConfirmationEmail({ email, app, product, amountCents, appConfig, productConfig, credits }) {
  if (!email || !process.env.RESEND_API_KEY) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${appConfig.name} <hello@groundedvote.com>`,
      to: [email],
      subject: `Payment confirmed — ${productConfig.name}`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:32px;background:#0F1B1F;color:#F5F0E8;">
          <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D8AB69;margin:0 0 16px;">The Founded Project</p>
          <h1 style="color:#F5F0E8;font-size:24px;font-weight:300;margin:0 0 12px;">Payment confirmed.</h1>
          <p style="color:rgba(245,240,232,0.7);margin:0 0 8px;">${productConfig.name}</p>
          <p style="color:#D8AB69;font-size:20px;font-weight:700;margin:0 0 24px;">$${(amountCents / 100).toFixed(2)}</p>
          ${credits ? `<p style="color:rgba(245,240,232,0.6);margin:0 0 24px;">${credits.toLocaleString()} API credits have been added to your account. Your API key details are in a separate email.</p>` : ''}
          <a href="${appConfig.url}" style="display:inline-block;background:#D8AB69;color:#0F1B1F;padding:12px 28px;text-decoration:none;font-weight:700;border-radius:4px;">Return to ${appConfig.name}</a>
          <p style="color:rgba(245,240,232,0.3);font-size:11px;margin-top:32px;">The Founded Project LLC · Minneapolis, MN</p>
        </div>
      `,
    }),
  }).catch(err => console.error('Confirmation email error:', err))
}
