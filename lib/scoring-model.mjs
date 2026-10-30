/**
 * Bias scoring model with a backup.
 *
 * GPT-4o scores questions because it is a different company's model from the
 * Claude models that write and select them. If OpenAI fails for any reason
 * (out of credit, bad key, outage, unusable reply), Claude Sonnet scores
 * instead with the same blind prompt. Callers record the returned model name,
 * so the public audit trail shows which questions lost that separation.
 *
 * .mjs so the CommonJS scripts can reach it with import().
 */
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export const PRIMARY_MODEL = 'gpt-4o'
export const BACKUP_MODEL = 'claude-sonnet-4-6'

const TIMEOUT_MS = 30_000

// Clients are created on first use: constructing them at module scope crashes
// `next build` when API keys are absent, and a missing OpenAI key has to reach
// the backup instead of throwing on import.
let _openai, _anthropic
const defaultClients = {
  openai: () => (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY })),
  anthropic: () => (_anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })),
}

// An exhausted account also answers 429, and retrying that can't help.
function isTransient(err) {
  if (err.code === 'insufficient_quota') return false
  return err.name === 'AbortError' || [429, 502, 503].includes(err.status)
}

async function callOpenAI(client, prompt, { json, temperature, signal }) {
  const response = await client.chat.completions.create({
    model: PRIMARY_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  }, { signal })
  const text = response.choices[0]?.message?.content
  if (!text) throw new Error('OpenAI returned empty content')
  return text
}

async function callClaude(client, prompt, { temperature, signal }) {
  const response = await client.messages.create({
    model: BACKUP_MODEL,
    max_tokens: 1024,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  }, { signal })
  const text = (response.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('')
  if (!text) throw new Error('Claude returned empty content')
  return text
}

async function attempt(call, parse) {
  for (let tries = 1; ; tries++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      return parse(await call(controller.signal))
    } catch (err) {
      if (tries >= 2 || !isTransient(err)) throw err
      await new Promise(r => setTimeout(r, 2000))
    } finally {
      clearTimeout(timer)
    }
  }
}

/**
 * Runs the prompt on GPT-4o, then on Claude if GPT-4o fails or its reply can't
 * be parsed. Returns { value, model }; throws only when both fail.
 */
export async function completeWithBackup(prompt, {
  json = false,
  temperature = 0,
  parse = text => text,
  clients = defaultClients,
} = {}) {
  try {
    const value = await attempt(signal => callOpenAI(clients.openai(), prompt, { json, temperature, signal }), parse)
    return { value, model: PRIMARY_MODEL }
  } catch (primaryErr) {
    console.warn(`[scoring] ${PRIMARY_MODEL} failed, using ${BACKUP_MODEL}: ${primaryErr.message}`)
    try {
      const value = await attempt(signal => callClaude(clients.anthropic(), prompt, { temperature, signal }), parse)
      return { value, model: BACKUP_MODEL }
    } catch (backupErr) {
      throw new Error(`Both scoring models failed. ${PRIMARY_MODEL}: ${primaryErr.message}. ${BACKUP_MODEL}: ${backupErr.message}`)
    }
  }
}

/** Parses a JSON object out of a reply, tolerating code fences or prose around it. */
export function parseJsonObject(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error(`No JSON object in reply: ${text.slice(0, 120)}`)
  return JSON.parse(text.slice(start, end + 1))
}

/** Turns a bias-scoring reply into one score per variant. */
export function normalizeScores(parsed, variantCount) {
  // json_object mode forces an object wrapper and models vary in how they
  // wrap: normalize every shape we have seen to a plain array.
  let scores = null
  if (Array.isArray(parsed)) scores = parsed
  else if (Array.isArray(parsed.scores)) scores = parsed.scores
  else if (Array.isArray(parsed.questions)) scores = parsed.questions
  else {
    const values = Object.values(parsed)
    if (values.length === 1 && Array.isArray(values[0])) scores = values[0]
    else if (values.length >= variantCount && values.every(v => v && typeof v === 'object')) scores = values
  }
  if (!Array.isArray(scores) || scores.length < variantCount) {
    throw new Error(`Scoring reply had an unusable shape: ${JSON.stringify(parsed).slice(0, 120)}`)
  }
  // Recompute totals defensively: selection sorts on them.
  return scores.map((s, i) => ({
    index: s.index ?? i,
    loaded_language: s.loaded_language ?? 0,
    false_equivalence: s.false_equivalence ?? 0,
    asymmetric_framing: s.asymmetric_framing ?? 0,
    cultural_assumption: s.cultural_assumption ?? 0,
    total: s.total ?? (s.loaded_language ?? 0) + (s.false_equivalence ?? 0) + (s.asymmetric_framing ?? 0) + (s.cultural_assumption ?? 0),
  }))
}

/** Scores variants on the given prompt. Each returned score names the model that produced it. */
export async function scoreWithBackup(prompt, variantCount, options = {}) {
  const { value, model } = await completeWithBackup(prompt, {
    json: true,
    temperature: 0,
    parse: text => normalizeScores(parseJsonObject(text), variantCount),
    ...options,
  })
  return value.map(s => ({ ...s, scoredBy: model }))
}
