#!/usr/bin/env node
/**
 * Build script — turn every spoken line in the app into a pre-rendered MP3.
 *
 * Why: the browser's SpeechSynthesis voice is jarringly robotic on iPad, and
 * the lesson is supposed to feel warm. We render once with OpenAI's TTS, ship
 * the audio in /public/voice, and the runtime plays the cached clip whenever
 * the spoken text matches.
 *
 * Inputs
 *   - src/lesson/script.ts        — the conversation tree (every beat.text)
 *   - src/voice/extras.json       — extra static lines (game intros, hints)
 *
 * Outputs
 *   - public/voice/<hash>.mp3     — one file per unique line
 *   - public/voice/manifest.json  — { text → file } so the client can look up
 *
 * Incremental: a clip is skipped if its hash already exists on disk. Bump
 * MODEL or VOICE to force a full re-render.
 *
 * Required env: OPENAI_API_KEY
 * Optional env: OPENAI_TTS_MODEL  (default: gpt-4o-mini-tts)
 *               OPENAI_TTS_VOICE  (default: nova)
 *               OPENAI_TTS_FORMAT (default: mp3)
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npm run voice
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const VOICE_DIR = join(ROOT, 'public', 'voice')
const MANIFEST_PATH = join(VOICE_DIR, 'manifest.json')

const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'
const VOICE = process.env.OPENAI_TTS_VOICE || 'nova'
const FORMAT = process.env.OPENAI_TTS_FORMAT || 'mp3'

// Steering for gpt-4o-mini-tts. tts-1 / tts-1-hd ignore this safely.
const INSTRUCTIONS = [
  'You are Nova, a warm, patient tutor speaking to a curious nine-year-old.',
  'Voice: soft, bright, a little playful — like reading a bedtime story but awake.',
  'Pace: unhurried. Tiny pauses on commas. A gentle lift on questions.',
  'Energy: encouraging, never patronising; small bursts of delight on a win.',
  'Pronunciation: say fractions naturally — "one half", "two quarters", "three sixths".',
].join(' ')

const norm = (s) => s.replace(/\s+/g, ' ').trim()
const hash = (s) =>
  createHash('sha1').update(`${MODEL}|${VOICE}|${FORMAT}|${norm(s)}`).digest('hex').slice(0, 16)

/** Extract every `text: "..."` (or 'single' or `backtick`) string from script.ts.
 *  No real parser — the script file is tiny, stable, and the regex is robust
 *  enough for our shape (no nested same-quote inside the literal). */
function extractBeatTexts(src) {
  const out = []
  const re = /\btext:\s*(["'`])((?:\\.|(?!\1).)*)\1/g
  let m
  while ((m = re.exec(src)) !== null) {
    const raw = m[2]
    const text = raw
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\(['"`])/g, '$1')
      .replace(/\\\\/g, '\\')
    out.push(text)
  }
  return out
}

/* ──────────────────────────────────────────────────────────────────────────────
 * Game lines — enumerated in lockstep with each game's `message =` ternary so
 * every concrete string Nova can say in a game becomes a cached MP3 at build
 * time. Keep the templates here in sync with the corresponding games. The
 * relevant LEVELS / ROUNDS arrays are mirrored verbatim from the source.
 * ──────────────────────────────────────────────────────────────────────────── */

// MIRROR: src/lib/frac.ts spokenLabel
const CARD = ['zero','one','two','three','four','five','six','seven','eight','nine','ten']
const DSING = { 2:'half',3:'third',4:'quarter',5:'fifth',6:'sixth',7:'seventh',8:'eighth',9:'ninth',10:'tenth' }
const DPLUR = { 2:'halves',3:'thirds',4:'quarters',5:'fifths',6:'sixths',7:'sevenths',8:'eighths',9:'ninths',10:'tenths' }
function spokenLabel(n, d) {
  if (d === 1) return n === 1 ? 'one' : (CARD[n] ?? `${n}`)
  const num = CARD[n] ?? `${n}`
  if (n === 1 && DSING[d]) return `${num} ${DSING[d]}`
  if (DPLUR[d]) return `${num} ${DPLUR[d]}`
  return `${n} over ${d}`
}
function gcd(a, b) { return b === 0 ? Math.abs(a) : gcd(b, a % b) }
function reduce([n, d]) { const g = gcd(n, d) || 1; return [n / g, d / g] }

function buildGameLines() {
  const out = new Set()
  const add = (s) => out.add(s)

  // MIRROR: src/games/PourIn.tsx — LEVELS and message ternary
  for (const [n, d] of [[1,2],[3,4],[1,3],[2,3],[1,4]]) {
    const T = spokenLabel(n, d)
    add(`That's exactly ${T} of a glass. Beautiful. Ready for the next?`)
    add(`A little too much for ${T}. Tap empty and have another go.`)
    add(`Just under ${T}. Tap empty and try again.`)
    add(`Stop at ${T}…`)
    add(`Press and hold the button below. Pour the glass up to ${T}.`)
  }
  add(`You poured every single one. You really feel the fractions now.`)

  // MIRROR: src/games/PourOut.tsx — LEVELS and message ternary
  for (const [n, d] of [[1,2],[1,3],[2,3],[1,4],[3,4]]) {
    const T = spokenLabel(n, d)
    add(`Perfectly poured — ${T} left in the glass. Onward!`)
    add(`Too much left — you needed only ${T}. Tap fill and try again.`)
    add(`You poured a bit too far. Aim to leave ${T}. Tap fill and retry.`)
    add(`Tap "Listen for tilt", then tilt the iPad to pour. Leave ${T} behind.`)
    add(`Drag the slider to tilt the glass. Stop pouring when ${T} is left.`)
    add(`Tilt to pour — stop when the water reaches ${T}.`)
  }
  add(`You poured every one. You're reading fractions like a chef.`)

  // MIRROR: src/games/CakeSlice.tsx — LEVELS and message ternary
  for (const [n, d] of [[1,2],[1,4],[1,3],[3,4],[1,6]]) {
    const T = spokenLabel(n, d)
    add(`You sliced exactly ${T} of the cake. Magnificent. Next?`)
    add(`Close! That slice is a bit too big for ${T}. Slice again.`)
    add(`Close! That slice is a bit too small for ${T}. Slice again.`)
    add(`Swipe down across the cake along the dotted line to slice off ${T} of it.`)
  }
  add(`Every cake, sliced perfectly. You really see fractions in shapes now.`)
  add(`Hmm, your swipe didn't cross the cake. Try a longer drag from edge to edge.`)

  // MIRROR: src/games/BalanceScale.tsx — LEVELS and message ternary
  for (const [n, d] of [[1,2],[3,4],[2,3],[1,4]]) {
    const T = spokenLabel(n, d)
    add(`Balanced! That weighs exactly ${T}. You matched every one — nice work. Here's a fresh set…`)
    add(`Balanced! Those fractions together weigh exactly ${T} — equivalent. Next one…`)
    add(`Make the right side weigh the same as ${T} on the left — using other fractions.`)
  }

  // MIRROR: src/games/CookieShare.tsx — ROUNDS and message ternary
  for (const { kids, cookies } of [{ kids: 4, cookies: 2 }, { kids: 4, cookies: 3 }]) {
    const [tN, tD] = reduce([cookies, kids])
    const T = spokenLabel(tN, tD)
    add(`Perfect — ${cookies} cookies shared between ${kids} friends, so everyone gets ${T} of a cookie. Ready for a tougher one?`)
    add(`You did it! ${cookies} cookies between ${kids} friends is ${T} each. Sharing fairly IS a fraction. Brilliant.`)
    add(`Share ${cookies} cookies fairly between ${kids} friends. Tap a cookie to cut it in half, then drag the pieces so everyone gets the same.`)
  }
  add(`Close! Someone has more than the others. Every friend needs the exact same amount — tap a piece to send it back and try again.`)

  return [...out]
}

async function loadLines() {
  const scriptSrc = await readFile(join(ROOT, 'src', 'lesson', 'script.ts'), 'utf8')
  const beatLines = extractBeatTexts(scriptSrc)

  let extras = []
  try {
    extras = JSON.parse(await readFile(join(ROOT, 'src', 'voice', 'extras.json'), 'utf8'))
  } catch {
    extras = []
  }

  const gameLines = buildGameLines()

  // Dedupe by normalised content so trivial whitespace differences don't double-cost us.
  const byNorm = new Map()
  for (const t of [...beatLines, ...extras, ...gameLines]) {
    if (!t) continue
    const key = norm(t)
    if (!byNorm.has(key)) byNorm.set(key, t)
  }
  return [...byNorm.values()]
}

async function tts(text) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is required')
  const body = {
    model: MODEL,
    voice: VOICE,
    input: text,
    response_format: FORMAT,
  }
  // gpt-4o-mini-tts supports steering via `instructions`; legacy tts-1 ignores it.
  if (MODEL.includes('4o')) body.instructions = INSTRUCTIONS

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`OpenAI TTS ${res.status}: ${detail.slice(0, 240)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  await mkdir(VOICE_DIR, { recursive: true })
  const lines = await loadLines()
  console.log(`Found ${lines.length} unique lines · model=${MODEL} · voice=${VOICE}`)

  const manifest = { version: 2, model: MODEL, voice: VOICE, format: FORMAT, lines: [] }
  let made = 0
  let cached = 0

  for (const text of lines) {
    const id = hash(text)
    const rel = `voice/${id}.${FORMAT}`
    const abs = join(VOICE_DIR, `${id}.${FORMAT}`)

    if (existsSync(abs)) {
      cached++
    } else {
      const preview = norm(text).slice(0, 64)
      process.stdout.write(`  ${id}  ${preview}${preview.length < norm(text).length ? '…' : ''}\n`)
      const buf = await tts(text)
      await writeFile(abs, buf)
      made++
      // Be polite to the API.
      await new Promise((r) => setTimeout(r, 250))
    }

    manifest.lines.push({ id, file: rel, text })
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log(`✓ ${made} new · ${cached} cached → public/voice/manifest.json`)
}

main().catch((err) => {
  console.error('✗ voice build failed:', err.message || err)
  process.exit(1)
})
