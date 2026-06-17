#!/usr/bin/env node
/**
 * add-copyright-headers.js
 * Run once from repo root: node scripts/add-copyright-headers.js
 * Prepends the proprietary copyright notice to every .js file
 * in lib/, app/api/, app/page.js, and scripts/.
 * Skips files that already contain the copyright notice.
 *
 * Copyright Â© 2025 The Founded Project LLC
 * All rights reserved.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const HEADER = `/**
 * Copyright Â© 2025 The Founded Project LLC
 * All rights reserved. Proprietary and confidential.
 *
 * This source code is the exclusive property of The Founded Project LLC
 * and may not be copied, modified, distributed, or used without explicit
 * written permission from The Founded Project LLC.
 *
 * GroundedVoteâ¢ â A Civic Alignment Engine
 * https://groundedvote.com
 */

`

const MARKER = 'Copyright Â© 2025 The Founded Project LLC'

const TARGET_DIRS = ['lib', 'app/api', 'scripts']
const TARGET_FILES = ['app/page.js']

function walk(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) results.push(...walk(full))
    else if (extname(full) === '.js') results.push(full)
  }
  return results
}

const files = [
  ...TARGET_DIRS.flatMap(d => { try { return walk(d) } catch { return [] } }),
  ...TARGET_FILES,
]

let added = 0, skipped = 0
for (const file of files) {
  try {
    const content = readFileSync(file, 'utf8')
    if (content.includes(MARKER)) { skipped++; continue }
    writeFileSync(file, HEADER + content, 'utf8')
    console.log('  â ' + file)
    added++
  } catch (err) {
    console.error('  â ' + file + ': ' + err.message)
  }
}

console.log(`\nDone. ${added} files updated, ${skipped} already had header.`)
