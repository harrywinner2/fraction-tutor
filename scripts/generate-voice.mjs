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

async function loadLines() {
  const scriptSrc = await readFile(join(ROOT, 'src', 'lesson', 'script.ts'), 'utf8')
  const beatLines = extractBeatTexts(scriptSrc)

  let extras = []
  try {
    extras = JSON.parse(await readFile(join(ROOT, 'src', 'voice', 'extras.json'), 'utf8'))
  } catch {
    extras = []
  }

  // Dedupe by normalised content so trivial whitespace differences don't double-cost us.
  const byNorm = new Map()
  for (const t of [...beatLines, ...extras]) {
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
