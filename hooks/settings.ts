import type { ClawdifyContext, ClawdifySettings } from '../types'

export type Key = keyof ClawdifySettings

// Empty string everywhere means "Claude Code's own behaviour".
export const DEFAULTS: ClawdifySettings = {
  spinnerVerbs: '',
  spinnerThinking: '',
  spinnerTools: '',
  spinnerResponding: '',
  spinnerSuffix: '',
  doneVerbs: '',
  doneTemplate: '',
  doneColor: '',
  doneToastSecs: '',
  hint: '',
  hintTail: '',
  modeLabel: '',
  backgroundHint: '',
  banner: '',
  bannerColor: '',
  bannerBorder: '',
  bannerAlign: '',
  statusText: '',
  userPrefix: '',
  userColor: '',
  replyRewrites: '',
  expandToolGroups: '',
  hideNotices: '',
  persona: '',
}

export const TABS = ['spinner', 'turn', 'prompt', 'banner', 'transcript', 'persona', 'presets'] as const
export type Tab = (typeof TABS)[number]

type Field = { key: Key; tab: Tab; label: string; hint: string; options?: readonly string[] }

const ON_OFF = ['', 'on'] as const

export const FIELDS: readonly Field[] = [
  { key: 'spinnerVerbs', tab: 'spinner', label: 'Words', hint: 'Clawing, Scuttling, Pinching' },
  { key: 'spinnerThinking', tab: 'spinner', label: 'While thinking', hint: 'Pondering, Brooding' },
  { key: 'spinnerTools', tab: 'spinner', label: 'While using tools', hint: 'Tinkering, Wrenching' },
  { key: 'spinnerResponding', tab: 'spinner', label: 'While responding', hint: 'Typing, Scribbling' },
  { key: 'spinnerSuffix', tab: 'spinner', label: 'Suffix', hint: ' ~  (replaces the …)' },
  { key: 'doneVerbs', tab: 'turn', label: 'Done words', hint: 'Clawed, Snipped' },
  { key: 'doneTemplate', tab: 'turn', label: 'Footer template', hint: '✓ {word} in {time}' },
  { key: 'doneColor', tab: 'turn', label: 'Footer colour', hint: 'green, #ff8800, ansi:cyan' },
  { key: 'doneToastSecs', tab: 'turn', label: 'Toast after (s)', hint: '30 = toast when a turn ran 30s+' },
  { key: 'hint', tab: 'prompt', label: 'Hint (replace)', hint: 'replaces "? for shortcuts" when idle' },
  { key: 'hintTail', tab: 'prompt', label: 'Hint tail', hint: 'snip snip' },
  { key: 'modeLabel', tab: 'prompt', label: 'Mode label', hint: 'crab mode' },
  { key: 'backgroundHint', tab: 'prompt', label: 'ctrl+b pill', hint: '"none" hides it' },
  { key: 'banner', tab: 'banner', label: 'Banner', hint: '🦀 {model} · {cwd} · {time}' },
  { key: 'bannerColor', tab: 'banner', label: 'Banner colour', hint: 'magenta, #c15f3c' },
  { key: 'bannerBorder', tab: 'banner', label: 'Banner border', hint: '', options: ['', 'round', 'single', 'double', 'bold', 'classic'] },
  { key: 'bannerAlign', tab: 'banner', label: 'Banner align', hint: '', options: ['', 'center', 'right'] },
  { key: 'statusText', tab: 'banner', label: 'Status line', hint: '{model} · {date} {time}' },
  { key: 'userPrefix', tab: 'transcript', label: 'Your prompt prefix', hint: '❯' },
  { key: 'userColor', tab: 'transcript', label: 'Your prompt colour', hint: 'cyan' },
  { key: 'replyRewrites', tab: 'transcript', label: 'Reply rewrites', hint: 'you=>ye; /\\bhello\\b/gi=>ahoy' },
  { key: 'expandToolGroups', tab: 'transcript', label: 'Expand tool groups', hint: '', options: ON_OFF },
  { key: 'hideNotices', tab: 'transcript', label: 'Hide startup notices', hint: '', options: ON_OFF },
  { key: 'persona', tab: 'persona', label: 'Persona', hint: 'Answer like a pirate.' },
]

export const PRESETS: Record<string, Partial<ClawdifySettings>> = {
  crab: {
    spinnerVerbs: 'Clawing, Scuttling, Pinching, Molting, Sidestepping',
    spinnerSuffix: ' 🦀',
    doneVerbs: 'Clawed, Snipped, Scuttled',
    hintTail: 'snip snip',
    modeLabel: 'crab mode',
    userPrefix: '🦀',
  },
  pirate: {
    spinnerVerbs: 'Plundering, Swashbuckling, Hoisting, Parleying',
    doneVerbs: 'Plundered, Pillaged',
    doneTemplate: '⚓ {word} for {time}',
    banner: '🏴‍☠️ Cap\'n {model} sails {cwd}',
    replyRewrites: '/\\byou\\b/gi=>ye; /\\bmy\\b/gi=>me',
    persona: 'Speak like a pirate, but keep code and commands exact.',
  },
  hacker: {
    spinnerThinking: 'Decrypting, Compiling, Brute-forcing',
    spinnerTools: 'Injecting, Patching, Rooting',
    spinnerResponding: 'Uplinking, Transmitting',
    spinnerSuffix: ' █',
    doneTemplate: '[OK] {word} in {time}',
    doneColor: 'green',
    userPrefix: 'root@claude:~#',
    userColor: 'green',
    banner: '>> {model} :: {cwd} :: {time}',
    bannerColor: 'green',
    bannerBorder: 'classic',
  },
  zen: {
    spinnerVerbs: 'Breathing, Settling, Noticing',
    spinnerSuffix: ' .',
    doneTemplate: '· {time} ·',
    doneColor: 'gray',
    hint: 'one thing at a time',
    hideNotices: 'on',
    persona: 'Be calm and brief. Prefer the smallest change.',
  },
  minimal: {
    spinnerSuffix: '',
    doneTemplate: '{time}',
    hint: ' ',
    backgroundHint: 'none',
    hideNotices: 'on',
    expandToolGroups: '',
  },
}

export const list = (value: string) => value.split(',').map(word => word.trim()).filter(Boolean)

// The engine samples a fresh word per turn; hashing the seed keeps our pick stable across redraws.
export const pick = (words: readonly string[], seed: string) => {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return words[Math.abs(hash) % words.length] ?? seed
}

export const duration = (ms: number) => {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

const pad = (n: number) => String(n).padStart(2, '0')

export const fill = (template: string, ctx: ClawdifyContext, extra: Record<string, string> = {}) => {
  const d = new Date(ctx.now)
  const vars: Record<string, string> = {
    model: ctx.model,
    cwd: ctx.cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? ctx.cwd,
    path: ctx.cwd,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    ...extra,
  }
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole)
}

// "a=>b; /re/flags=>c": plain or regex find/replace, applied in order. Bad regexes are skipped.
export const rewrite = (text: string, rules: string) => {
  let out = text
  for (const rule of rules.split(';')) {
    const at = rule.indexOf('=>')
    if (at < 0) continue
    const from = rule.slice(0, at).trim()
    const to = rule.slice(at + 2).trim()
    if (!from) continue
    const re = /^\/(.+)\/([a-z]*)$/.exec(from)
    if (!re) {
      out = out.split(from).join(to)
      continue
    }
    try {
      out = out.replace(new RegExp(re[1] ?? '', re[2]), to)
    } catch {
      // ponytail: an invalid regex is ignored rather than reported; surface it in the pane if people trip on it.
    }
  }
  return out
}

// Trust boundary for /clawdify import and the store: keep known keys with string values only.
export const clean = (raw: unknown): Partial<ClawdifySettings> => {
  if (!raw || typeof raw !== 'object') return {}
  const out: Partial<ClawdifySettings> = {}
  for (const key of Object.keys(DEFAULTS) as Key[]) {
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value === 'string') out[key] = value
  }
  return out
}

export const isKey = (key: string): key is Key => key in DEFAULTS

export const changed = (settings: ClawdifySettings) => clean(
  Object.fromEntries(Object.entries(settings).filter(([key, value]) => value !== DEFAULTS[key as Key])),
)

// System prompt for /clawdify <request>: every setting, what it takes, and where things stand now.
export const brief = (s: ClawdifySettings) => [
  "You configure clawdify, a Claude Code mod that restyles the CLI. Turn the user's request into setting changes.",
  'Reply with ONE JSON object and nothing else: setting keys to string values, only the keys to change. "" restores Claude Code\'s default. Reply {} if nothing fits.',
  'Settings:',
  ...FIELDS.map(f => `- ${f.key} (${f.tab}): ${f.label}${f.options ? `; one of ${f.options.map(o => JSON.stringify(o)).join(', ')}` : `; e.g. ${f.hint}`}`),
  'Lists are comma-separated. Colours are names (green, magenta, gray, ...) or #rrggbb. Template tokens: {model} {cwd} {path} {time} {date}; in doneTemplate {word} is the done word and {time} the turn length.',
  'replyRewrites is display-only find/replace on Claude\'s replies: "a=>b; /re/flags=>c". persona is text added to Claude\'s system prompt.',
  `Presets to borrow from: ${JSON.stringify(PRESETS)}`,
  `Current non-default settings: ${JSON.stringify(changed(s))}`,
].join('\n')

// The model's reply is untrusted: take the outermost {...}, then keep known string keys only.
export const parseChange = (text: string) => {
  try {
    return clean(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)))
  } catch {
    return undefined
  }
}
