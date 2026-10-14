// node scripts/test-campaign-site.mjs — offline checks for lib/campaign-site.js page selection
import assert from 'node:assert/strict'
import { issueLinks } from '../lib/campaign-site.js'

const html = `
  <a href="/">Home</a>
  <a href="/privacy-policy">Privacy Policy</a>
  <a href="/donate">Donate</a>
  <a href="/meet-jane">Meet Jane</a>
  <a href="/issues"><span><span>Where I Stand</span></span></a>
  <a href="/priorities/">Priorities</a>
  <a href="https://other.example/issues">Elsewhere</a>
  <a href="/news/2026/plan-for-housing">Housing plan announced</a>`
const { issue, about } = issueLinks(html, 'https://jane.example')
assert.deepEqual(issue, ['https://jane.example/issues', 'https://jane.example/priorities/'], 'issue pages kept, news/privacy/off-site dropped')
assert.deepEqual(about, ['https://jane.example/meet-jane'])
console.log('campaign-site: all checks passed')
