import type { On, RenderElement } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { NO_USAGE, fill, rewrite } from '../hooks/settings'

// The test's own hooks stand for the engine: the last props the plugin passed down, and stubs for the rest.
const engine = (on: On, stored?: Record<string, unknown>) => {
  // The saved settings file, open to the test so it can edit it as Claude would.
  const disk: Record<string, unknown> = { ...stored }
  on('store.get', (_, e) => ({ value: disk[e.key] }))
  on('store.set', (_, e) => {
    disk[e.key] = JSON.parse(JSON.stringify(e.value))
    return { value: undefined }
  })
  const clock = mock.clock(on)
  const seen: { props?: Record<string, unknown>; clock: typeof clock; statuses: (string | undefined)[]; disk: typeof disk } = { clock, statuses: [], disk }
  on('ui.render', ($, e) => {
    seen.props = e.props as Record<string, unknown>
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, '') as RenderElement
  })
  on('session.start', (_, e) => e)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.status', (_, e) => {
    seen.statuses.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'hi', scope: 'shared' as const }] }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('ui.copy', () => ({ value: { isCopied: true as const } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, percent: 91 }, rateLimits: [{ kind: 'five_hour', percentUsed: 12 }], cost: { usd: 0.5 } } }))
  on('fs.read', () => ({ value: 'ref: refs/heads/main\n' }))
  return seen
}

const start = ($: Engine) =>
  $.session.start({ cwd: 'C:/Repos/clawdify', surface: 'terminal', isInteractive: true })

const command = ($: Engine, args: string) =>
  $.command.run({ command: 'clawdify', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } })

const SPINNER = { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } as const
const PANE = { title: 'clawdify', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } as const
const BAND = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} } as const

test('the pane edits every tab on terminal and desktop', async ($, on) => {
  const seen = engine(on)
  await start($)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'clawdify', surface, component: 'Pane', requestId: 'clawdify', props: PANE })
    await ui.press({ key: 'tab-spinner' })
    await ui.input({ key: 'spinnerVerbs', text: 'Clawing, Scuttling' })
    await ui.input({ key: 'spinnerThinking', text: 'Pondering' })
    await ui.input({ key: 'spinnerSuffix', text: ' ~' })
    await ui.press({ key: 'tab-turn' })
    await ui.input({ key: 'doneTemplate', text: '✓ {word} in {time}' })
    await ui.input({ key: 'doneVerbs', text: 'Clawed' })
    await ui.press({ key: 'tab-banner' })
    await ui.input({ key: 'banner', text: '{model} @ {cwd}' })
    await ui.select({ key: 'bannerBorder', value: 'round' })
    await ui.press({ key: 'tab-transcript' })
    await ui.select({ key: 'hideNotices', value: 'on' })
    await ui.unmount()
  }

  await $.ui.render({ surface: 'terminal', component: 'Spinner', requestId: 'a', props: SPINNER })
  expect(seen.props?.word).toBe('Pondering')
  expect(seen.props?.suffix).toBe(' ~')
  await $.ui.render({ surface: 'terminal', component: 'Spinner', requestId: 'a', props: { ...SPINNER, mode: 'responding' } })
  expect(['Clawing', 'Scuttling']).toContain(seen.props?.word)

  const footer = await $.ui.render({ surface: 'terminal', component: 'TurnDuration', requestId: 'b', props: { word: 'Baked', durationMs: 64000 } })
  expect(JSON.stringify(footer)).toContain('✓ Clawed in 1m 4s')

  const band = await $.ui.render({ surface: 'terminal', component: 'AbovePrompt', requestId: 'c', props: BAND })
  expect(JSON.stringify(band)).toContain('claude-opus-5-5 @ clawdify')
  expect(JSON.stringify(band)).toContain('round')

  const notice = await $.ui.render({ surface: 'terminal', component: 'InfoNotice', requestId: 'd', props: { text: 'hi', command: null } })
  expect(JSON.stringify(notice)).toContain('none')
})

test('commands set, preset, export, import and reset', async ($, on) => {
  const seen = engine(on)
  await start($)

  expect((await command($, 'set hintTail snip snip')).text).toContain('snip snip')
  await $.ui.render({ surface: 'terminal', component: 'PromptHint', requestId: 'h', props: { isDraft: false, isWorking: false, hint: '? for shortcuts' } })
  expect(seen.props?.tail).toBe(' · snip snip')

  expect((await command($, 'set nope x')).text).toContain('Unknown key')

  await command($, 'preset pirate')
  const composed = await $.prompt.compose({ model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
  expect(composed.sections.slice(-2).map(x => x.id)).toEqual(['clawdify:persona', 'clawdify:settings'])
  await $.ui.render({ surface: 'terminal', component: 'AssistantMessage', requestId: 'r', props: { text: 'Did you see my code?', isFirstOfReply: true } })
  expect(seen.props?.text).toBe('Did ye see me code?')

  const exported = (await command($, 'export')).text ?? ''
  expect(exported).toContain('Copied')
  const json = exported.slice(exported.indexOf('{'))

  await command($, 'reset')
  expect((await command($, 'get')).text).toContain('defaults')

  expect((await command($, `import ${json}`)).text).toContain('Imported')
  expect((await command($, 'get')).text).toContain('hintTail')
  expect((await command($, 'import {nope')).text).toContain('not valid JSON')
})

test('leaves everything alone until something is set', async ($, on) => {
  const seen = engine(on)
  await start($)
  await $.ui.render({ surface: 'terminal', component: 'Spinner', requestId: 'a', props: SPINNER })
  expect(seen.props).toEqual(SPINNER)
  await $.ui.render({ surface: 'terminal', component: 'UserMessage', requestId: 'u', props: { text: 'hi', origin: { kind: 'composer' }, isExpanded: false } })
  expect(seen.props?.text).toBe('hi')
})

test('saved settings come back at session start, junk dropped', async ($, on) => {
  const seen = engine(on, { settings: { doneVerbs: 'Clawed', evil: 1, persona: 42 } })
  await start($)
  await $.ui.render({ surface: 'terminal', component: 'TurnDuration', requestId: 'b', props: { word: 'Baked', durationMs: 3000 } })
  expect(seen.props?.word).toBe('Clawed')
  expect((await command($, 'get')).text).not.toContain('persona')
})

test('templates and rewrites', async () => {
  const ctx = { cwd: 'C:\\Repos\\clawdify', model: 'opus', now: new Date(2026, 9, 2, 9, 5).getTime(), ...NO_USAGE }
  expect(fill('{model} {cwd} {time} {date} {nope}', ctx)).toBe('opus clawdify 09:05 2026-10-02 {nope}')
  expect(rewrite('hello you', 'hello=>ahoy; /\\byou\\b/g=>ye')).toBe('ahoy ye')
  expect(rewrite('keep', '/(/=>x')).toBe('keep')
})

test('/clawdify <request> asks the model and applies only known keys', async ($, on) => {
  engine(on)
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
  const asked: string[] = []
  let text = 'Sure!\n{"spinnerVerbs": "Diving, Surfacing", "evil": "x", "doneColor": 7}'
  on('model.complete', (_, e) => {
    asked.push(`${e.system}\n${e.prompt}`)
    return { value: { isAnswered: true as const, text, usage } }
  })
  await start($)

  const reply = (await command($, 'make it feel like a submarine')).text ?? ''
  expect(reply).toContain('spinnerVerbs = "Diving, Surfacing"')
  expect(reply).not.toContain('evil')
  expect(asked[0]).toContain('make it feel like a submarine')
  expect(asked[0]).toContain('bannerBorder')
  expect((await command($, 'get')).text).toContain('Diving')

  text = 'no idea'
  expect((await command($, 'do something weird')).text).toContain("Couldn't read")
  text = '{}'
  expect((await command($, 'do nothing')).text).toContain('Nothing to change')
})

test('preset clawd draws Clawd above the prompt only, scuttling while working', async ($, on) => {
  const seen = engine(on)
  await start($)
  await command($, 'preset clawd')

  const idle = JSON.stringify(await $.ui.render({ surface: 'terminal', component: 'AbovePrompt', requestId: 'c', props: BAND }))
  expect(idle).toContain('▐▛███▜▌')
  expect(idle).toContain("G'day! claude-opus-5-5")

  const poses = new Set<string>()
  for (let i = 0; i < 4; i++) {
    await seen.clock.advance(250)
    poses.add(JSON.stringify(await $.ui.render({ surface: 'terminal', component: 'AbovePrompt', requestId: 'c', props: { ...BAND, isWorking: true } })))
  }
  expect(poses.size).toBeGreaterThan(1)

  await $.ui.render({ surface: 'terminal', component: 'Spinner', requestId: 'a', props: SPINNER })
  expect(seen.props?.suffix).toBe('…')
  expect(String(seen.props?.word)).not.toBe('Sauteing')
})

test('the clawd footer replaces the hint row with live usage and no Clawd', async ($, on) => {
  engine(on)
  await start($)
  await command($, 'preset clawd')
  const footer = JSON.stringify(await $.ui.render({ surface: 'terminal', component: 'PromptHint', requestId: 'h', props: { isDraft: false, isWorking: true, hint: 'esc to interrupt' } }))
  expect(footer).toContain('claude-opus-5-5')
  expect(footer).toContain('main')
  expect(footer).toContain('91%')
  expect(footer).toContain('#c15f3c')
  expect(footer).toContain('$0.50')
  expect(footer).toContain('esc to interrupt')
  expect(footer).not.toContain('▐▛')
})

test('an old status line moves into the footer, Clawd stripped, and the status entry is cleared', async ($, on) => {
  const seen = engine(on, { settings: { statusText: '{clawd} 🦀 ▐▛███▜▌ {model} · {date}' } })
  await start($)
  expect(seen.statuses).toEqual([undefined])
  const footer = JSON.stringify(await $.ui.render({ surface: 'terminal', component: 'PromptHint', requestId: 'h', props: { isDraft: false, isWorking: false, hint: '? for shortcuts' } }))
  expect(footer).toContain('claude-opus-5-5')
  expect(footer).not.toContain('▐')
  expect(footer).not.toContain('🦀')
  expect(footer).not.toContain('{clawd}')
})

test('a stock loop plays at its own pace while working and glances about while idle', async ($, on) => {
  const seen = engine(on)
  await start($)
  await command($, 'set mascot hop')
  const band = async (isWorking: boolean) => JSON.stringify(await $.ui.render({ surface: 'terminal', component: 'AbovePrompt', requestId: 'c', props: { ...BAND, isWorking } }))

  expect(await band(false)).toContain('▐▛███▜▌')
  const poses = new Set<string>()
  for (let i = 0; i < 8; i++) {
    await seen.clock.advance(120)
    poses.add(await band(true))
  }
  expect(poses.size).toBeGreaterThan(2)
  expect([...poses].join()).toContain('▙███▟')
})

test('settings survive a /clear, and edits to the saved file land on /clawdify reload', async ($, on) => {
  const seen = engine(on, { settings: { banner: 'saved banner', doneVerbs: 'Clawed' } })
  // After a /clear no session.start fires, so this session's copy is empty: draws fall back to the store.
  expect(JSON.stringify(await $.ui.render({ surface: 'terminal', component: 'AbovePrompt', requestId: 'c', props: BAND }))).toContain('saved banner')

  await start($)
  // Claude edits the file behind clawdify's back; the session keeps its copy until reload.
  seen.disk.settings = { banner: 'edited banner', doneVerbs: 'Clawed' }
  expect((await command($, 'reload')).text).toContain('edited banner')
  expect(JSON.stringify(await $.ui.render({ surface: 'terminal', component: 'AbovePrompt', requestId: 'c', props: BAND }))).toContain('edited banner')

  // A change lands on what is saved, so an unreloaded file edit is kept too.
  seen.disk.settings = { banner: 'edited banner', doneVerbs: 'Snipped' }
  await command($, 'set hint she will be right')
  expect(seen.disk.settings).toEqual({ banner: 'edited banner', doneVerbs: 'Snipped', hint: 'she will be right' })
})
