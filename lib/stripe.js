/**
 * The Founded Project LLC — Stripe Foundation Library
 *
 * One Stripe account. Multiple apps. All revenue to The Founded Project LLC.
 * Each transaction tagged with metadata: { app, product, entity }
 *
 * Apps:
 *   groundedvote       — civic alignment engine (donations)
 *   rhetoricalpoints   — bias detection API (credits + subscriptions)
 *   rootedreclaimers   — membership subscriptions
 *   lowlightvibes      — access subscriptions
 */

import Stripe from 'stripe'

// Created on first use — module-scope construction crashes `next build`
// when STRIPE_SECRET_KEY is absent. The Proxy keeps the `stripe` export
// shape unchanged for existing call sites.
let _stripe
function getStripe() {
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    appInfo: {
      name: 'The Founded Project',
      url: 'https://thefoundedproject.com',
    },
  }))
}

export const stripe = new Proxy({}, {
  get(_target, prop) {
    const client = getStripe()
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// ─── APP REGISTRY ─────────────────────────────────────────────────────────────
// Each app's products and price IDs live here.
// Create these in your Stripe dashboard, then paste the IDs below.
// Products: Dashboard → Product catalog → Add product

export const FOUNDED_APPS = {
  groundedvote: {
    name: 'GroundedVote',
    url: 'https://groundedvote.com',
    entity: 'The Founded Project LLC',
    products: {
      donation_once: {
        name: 'GroundedVote — One-Time Support',
        priceId: process.env.STRIPE_GV_DONATION_PRICE_ID || null, // set after creating in dashboard
        mode: 'payment',
      },
      donation_monthly: {
        name: 'GroundedVote — Monthly Supporter',
        priceId: process.env.STRIPE_GV_MONTHLY_PRICE_ID || null,
        mode: 'subscription',
      },
    },
  },
  rhetoricalpoints: {
    name: 'RhetoricalPoints',
    url: 'https://rhetoricalpoints.com',
    entity: 'The Founded Project LLC',
    products: {
      credits_starter: {
        name: 'RhetoricalPoints API — Starter Pack (500 credits)',
        priceId: process.env.STRIPE_RP_STARTER_PRICE_ID || null,
        mode: 'payment',
        credits: 500,
      },
      credits_pro: {
        name: 'RhetoricalPoints API — Pro Pack (2,500 credits)',
        priceId: process.env.STRIPE_RP_PRO_PRICE_ID || null,
        mode: 'payment',
        credits: 2500,
      },
      credits_scale: {
        name: 'RhetoricalPoints API — Scale Pack (10,000 credits)',
        priceId: process.env.STRIPE_RP_SCALE_PRICE_ID || null,
        mode: 'payment',
        credits: 10000,
      },
      subscription_monthly: {
        name: 'RhetoricalPoints — Monthly Pro',
        priceId: process.env.STRIPE_RP_MONTHLY_PRICE_ID || null,
        mode: 'subscription',
        creditsPerMonth: 3000,
      },
    },
  },
  rootedreclaimers: {
    name: 'RootedReclaimers',
    url: 'https://rootedreclaimers.com',
    entity: 'The Founded Project LLC',
    products: {
      membership_monthly: {
        name: 'RootedReclaimers — Monthly Membership',
        priceId: process.env.STRIPE_RR_MONTHLY_PRICE_ID || null,
        mode: 'subscription',
      },
      membership_annual: {
        name: 'RootedReclaimers — Annual Membership',
        priceId: process.env.STRIPE_RR_ANNUAL_PRICE_ID || null,
        mode: 'subscription',
      },
    },
  },
  lowlightvibes: {
    name: 'LowLight Vibes',
    url: 'https://lowlightvibes.com',
    entity: 'The Founded Project LLC',
    products: {
      access_monthly: {
        name: 'LowLight Vibes — Monthly Access',
        priceId: process.env.STRIPE_LLV_MONTHLY_PRICE_ID || null,
        mode: 'subscription',
      },
    },
  },
}

// ─── CHECKOUT SESSION FACTORY ─────────────────────────────────────────────────

/**
 * Create a Stripe Checkout session for any Founded app product.
 *
 * @param {object} opts
 * @param {string} opts.app         — app key from FOUNDED_APPS
 * @param {string} opts.product     — product key within that app
 * @param {string} opts.email       — customer email (pre-fills checkout)
 * @param {string} opts.successUrl  — redirect after payment
 * @param {string} opts.cancelUrl   — redirect on cancel
 * @param {object} opts.metadata    — extra metadata (userId, raceId, etc.)
 * @param {number} opts.amount      — for custom donation amounts (in cents)
 */
export async function createCheckoutSession({
  app,
  product,
  email,
  successUrl,
  cancelUrl,
  metadata = {},
  amount = null,
}) {
  const appConfig = FOUNDED_APPS[app]
  if (!appConfig) throw new Error(`Unknown app: ${app}`)

  const productConfig = appConfig.products[product]
  if (!productConfig) throw new Error(`Unknown product: ${app}.${product}`)

  const sessionMetadata = {
    app,
    product,
    entity: appConfig.entity,
    ...metadata,
  }

  // Custom donation amount (no priceId needed)
  if (amount && productConfig.mode === 'payment') {
    return stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: productConfig.name,
            metadata: sessionMetadata,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      metadata: sessionMetadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
  }

  if (!productConfig.priceId) {
    throw new Error(`Price ID not configured for ${app}.${product} — add it to your .env and Stripe dashboard`)
  }

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: productConfig.mode,
    customer_email: email || undefined,
    line_items: [{ price: productConfig.priceId, quantity: 1 }],
    metadata: sessionMetadata,
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(productConfig.mode === 'subscription' ? {
      subscription_data: { metadata: sessionMetadata },
    } : {}),
  })
}

// ─── WEBHOOK SIGNATURE VERIFICATION ──────────────────────────────────────────

export function constructWebhookEvent(payload, signature) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}
