import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ClawdifySettings } from '../types'
import { DEFAULTS, FIELDS, PRESETS, PRESET_NAME, TABS, NO_USAGE, brief, unclawd, changed, clawd, clean, cleanSaved, duration, fill, heat, isKey, list, parseChange, pick, rewrite, scuttle, tinyClawd } from './settings'
import type { Key, Saved, Tab } from './settings'
import { CRABS, FRIENDS, crabFrame } from './crabs'

const PANE = 'clawdify'
const SETTINGS = { plugin: 'clawdify', key: 'settings' } as const

const settings = atom(SETTINGS, DEFAULTS)
// The user's own presets; the store is the truth, this copy only redraws the pane.
const saved = atom({ plugin: 'clawdify', key: 'presets' } as const, {} as Saved)
const tab = atom({ plugin: 'clawdify', key: 'tab' } as const, 'spinner')
const CONTEXT = { plugin: 'clawdify', key: 'context' } as const
const context = atom(CONTEXT, { cwd: '', model: '', now: 0, ...NO_USAGE })
const frame = atom({ plugin: 'clawdify', key: 'frame' } as const, 0)

const SPINNER_FIELD: Record<string, Key> = {
  thinking: 'spinnerThinking',
  'tool-input': 'spinnerTools',
  'tool-use': 'spinnerTools',
  requesting: 'spinnerResponding',
  responding: 'spinnerResponding',
}

const USAGE = [
  '/clawdify                    open the editor pane',
  '/clawdify get                list what you changed',
  '/clawdify set <key> <value>  change one setting (empty value = default)',
  '/clawdify preset <name>      apply a preset on top: ' + Object.keys(PRESETS).join(', ') + ', or one you saved',
  '/clawdify save <name>        save your current look as a preset of your own',
  '/clawdify delete <name>      delete a preset you saved',
  '/clawdify reset [key]        back to Claude Code defaults',
  '/clawdify export             copy your settings as JSON',
  '/clawdify import <json>      load settings from JSON',
  '/clawdify reload             pick up edits made to the saved settings file',
  '/clawdify <anything else>    say what you want ("make it feel like a submarine"); Claude sets it',
  '',
  'Keys: ' + FIELDS.map(f => f.key).join(', '),
  'Template tokens: {model} {cwd} {path} {time} {date}; footer also {word} {time} = turn length.',
].join('\n')

type $ = EngineInterface

// The store is the truth; $.state is this session's copy. A /clear starts a new session with no
// session.start, so the copy is empty until ensure() refills it, and readers fall back to the store meanwhile.
const stored = async ($: $) => ({ ...DEFAULTS, ...clean(await $.store.get('settings')) })
const storedPresets = async ($: $) => cleanSaved(await $.store.get('presets'))

const current = async ($: $) => {
  const { value, version } = await $.state.get(SETTINGS)
  return version && value ? value : stored($)
}

// Each install (marketplace, --plugin-dir, dev mod) gets its own store file. An empty one adopts the
// newest sibling clawdify_*.json once, so settings made under another install carry over.
const adopt = async ($: $) => {
  if ((await $.store.get('settings')) !== undefined) return
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
  const dir = `${(await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${home}/.claude`}/plugins/store`
  const files = (await $.fs.list(dir).catch(() => []))
    .filter(f => f.kind === 'file' && /^clawdify_.*\.json$/.test(f.name))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
  for (const f of files) {
    const file: unknown = await $.fs.read(`${dir}/${f.name}`).then(text => JSON.parse(text)).catch(() => undefined)
    const found = file && typeof file === 'object' ? file as Record<string, unknown> : {}
    if (!found.settings || typeof found.settings !== 'object') continue
    await $.store.set('settings', clean(found.settings))
    if (found.presets) await $.store.set('presets', cleanSaved(found.presets))
    return
  }
}

const load = async ($: $) => {
  const s = await stored($)
  const p = await storedPresets($)
  await update($, saved, () => p)
  return update($, settings, () => s)
}

let cwd = ''

const ensure = async ($: $) => {
  if (!(await $.state.get(SETTINGS)).version) await load($)
  if (!(await $.state.get(CONTEXT)).version) {
    const model = await $.session.model().catch(() => '')
    await update($, context, () => ({ cwd, model, now: 0, ...NO_USAGE }))
  }
}

// Context fill, rate limits and cost as the status line has them, and the branch from .git/HEAD.
const refreshUsage = async ($: $) => {
  const old = (await $.state.get(CONTEXT)).value
  if (!old) return
  const usage = await $.session.usage().catch(() => undefined)
  const limit = (kind: string) => usage?.rateLimits.find(r => r.kind === kind)?.percentUsed ?? -1
  // ponytail: reads <cwd>/.git/HEAD only; a subfolder or a linked worktree shows no branch.
  const head = await $.fs.read(`${old.cwd}/.git/HEAD`).catch(() => '')
  const branch = /^ref: refs\/heads\/(.+)$/m.exec(head)?.[1] ?? head.trim().slice(0, 7)
  const next = { branch, context: usage?.context.percent ?? -1, limit5h: limit('five_hour'), limit7d: limit('seven_day'), cost: usage?.cost?.usd ?? -1 }
  if ((Object.keys(next) as (keyof typeof next)[]).every(key => old[key] === next[key])) return
  await update($, context, ctx => ({ ...ctx, ...next }))
}

const save = async ($: $, change: (old: ClawdifySettings) => ClawdifySettings) => {
  // Change what is saved, not this session's copy, so a stale copy or an edit to the file is never lost.
  const next = change(await stored($))
  await $.store.set('settings', changed(next))
  await update($, settings, () => next)
  return next
}

const savePresets = async ($: $, change: (old: Saved) => Saved) => {
  const next = change(await storedPresets($))
  await $.store.set('presets', next)
  await update($, saved, () => next)
}

const describe = (s: ClawdifySettings) => {
  const diff = Object.entries(changed(s))
  return diff.length ? diff.map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n') : 'Everything is at Claude Code defaults.'
}

const run = async ($: $, args: string): Promise<string> => {
  const [verb = '', ...rest] = args.trim().split(/\s+/)
  const tail = args.trim().slice(verb.length).trim()
  switch (verb) {
    case 'get':
      return describe(await current($))
    case 'set': {
      const key = rest[0] ?? ''
      if (!isKey(key)) return `Unknown key "${key}".\n\n${USAGE}`
      const value = tail.slice(key.length).trim()
      await save($, old => ({ ...old, [key]: value }))
      return value ? `${key} = ${JSON.stringify(value)}` : `${key} reset to default.`
    }
    case 'preset': {
      const name = rest[0] ?? ''
      const preset = PRESETS[name]
      // Built-ins layer on top; one of yours brings back exactly the look you saved.
      if (preset) await save($, old => ({ ...old, ...preset }))
      else {
        const mine = (await storedPresets($))[name]
        if (!mine) return `Presets: ${Object.keys(PRESETS).join(', ')}
Yours: ${Object.keys(await storedPresets($)).join(', ') || 'none yet (/clawdify save <name>)'}`
        await save($, () => ({ ...DEFAULTS, ...mine }))
      }
      return `Applied preset "${name}".`
    }
    case 'save': {
      const name = tail
      if (!PRESET_NAME.test(name)) return 'Name it with letters, digits, - or _ (up to 32): /clawdify save <name>'
      if (name in PRESETS) return `"${name}" is a built-in preset. Pick another name.`
      const look = changed(await current($))
      await savePresets($, old => ({ ...old, [name]: look }))
      return `Saved preset "${name}" (${Object.keys(look).length} settings). /clawdify preset ${name} brings it back.`
    }
    case 'delete': {
      const name = tail
      if (!(name in (await storedPresets($)))) return `You have no preset "${name}".`
      await savePresets($, old => Object.fromEntries(Object.entries(old).filter(([key]) => key !== name)))
      return `Deleted preset "${name}".`
    }
    case 'reset': {
      const key = rest[0]
      if (!key) {
        await save($, () => DEFAULTS)
        return 'All settings reset to Claude Code defaults.'
      }
      if (!isKey(key)) return `Unknown key "${key}".`
      await save($, old => ({ ...old, [key]: DEFAULTS[key] }))
      return `${key} reset.`
    }
    case 'export': {
      const json = JSON.stringify(changed(await current($)), null, 2)
      const { isCopied } = await $.ui.copy({ text: json })
      return `${isCopied ? 'Copied to clipboard:' : 'Settings:'}\n${json}`
    }
    case 'import': {
      let parsed: unknown
      try {
        parsed = JSON.parse(tail)
      } catch {
        return 'That is not valid JSON. Paste what /clawdify export gave you.'
      }
      const loaded = clean(parsed)
      await save($, () => ({ ...DEFAULTS, ...loaded }))
      return `Imported ${Object.keys(loaded).length} settings.`
    }
    case 'reload':
      return `Reloaded.
${describe(await load($))}`
    case 'help':
      return USAGE
    default:
      return ask($, args.trim())
  }
}

const ask = async ($: $, request: string) => {
  $.ui.toast('clawdify: asking Claude…')
  const reply = await $.model.complete({
    model: 'sonnet',
    system: brief(await current($)),
    prompt: request,
    effort: 'low',
    maxTokens: 2048,
    timeoutMs: 60000,
  })
  if (!reply.isAnswered) return `Claude didn't answer (${reply.reason}). Try again, or use /clawdify set.\n\n${USAGE}`
  const change = parseChange(reply.text)
  if (!change) return `Couldn't read Claude's answer:\n${reply.text}`
  const entries = Object.entries(change)
  if (!entries.length) return `Nothing to change for that. /clawdify help lists what can change.`
  await save($, old => ({ ...old, ...change }))
  return entries.map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n') + '\n\n/clawdify reset <key> undoes one.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // ponytail: clears the status entry clawdify drew up to 0.4; drop this once nobody upgrades from there.
    $.ui.status(undefined)
    cwd = e.cwd
    await adopt($)
    await load($)
    const model = await $.session.model().catch(() => '')
    await update($, context, () => ({ cwd, model, now: 0, ...NO_USAGE }))
    await $.command.register({
      name: 'clawdify',
      description: 'Customise Claude Code: spinner, footer, hint, banner, status, transcript',
      argumentHint: '[what you want | get | set <key> <value> | preset <name> | save <name> | delete <name> | reset [key] | export | import <json> | reload]',
    })
    const tick = async () => {
      const now = await $.clock.now()
      const old = (await $.state.get(CONTEXT)).value
      // Only write when the minute changes, so {time} readers redraw once a minute at most.
      if (old?.now && Math.floor(old.now / 60000) === Math.floor(now / 60000)) return
      await update($, context, ctx => ({ ...ctx, now }))
    }
    await tick()
    await refreshUsage($)
    $.clock.every(15000, () => void ensure($).then(() => refreshUsage($)))
    $.clock.every(15000, () => void tick())
    // ponytail: one 50ms clock drives every Clawd, and only while one is animated. frame holds elapsed ms,
    // written only when some Clawd's picture changes: 4x a second for the classic ones, at a stock loop's own pace.
    let ms = 0
    $.clock.every(50, async () => {
      const s = await current($)
      const crab = CRABS[s.mascot]
      const steps = [
        ...(s.mascot === 'animated' || s.spinnerSuffix.includes('{clawd}') ? [250] : []),
        ...(crab ? [crab.ms, CRABS.idle!.ms] : []),
      ]
      if (!steps.length) return
      ms += 50
      if (steps.some(step => ms % step < 50)) await update($, frame, () => ms)
    })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await ensure($)
    const model = await $.session.model().catch(() => '')
    if (model) await update($, context, ctx => (ctx.model === model ? ctx : { ...ctx, model }))
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refreshUsage($)
    const secs = Number((await current($)).doneToastSecs)
    if (!e.agentId && secs > 0 && e.durationMs >= secs * 1000) $.ui.toast(`Done in ${duration(e.durationMs)}`)
    return result
  })

  on('command.run', { command: 'clawdify' }, async ($, e) => {
    await ensure($)
    if (e.args.trim()) return { text: await run($, e.args) }
    await $.ui.open({ id: PANE, title: 'clawdify', focus: true })
    return { text: 'clawdify open. Enter saves a field; an empty field restores the default. /clawdify help for commands.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await current($)
    const active = (await read($, tab)) as Tab
    const mine = Object.keys(await read($, saved))

    if (e.surface === 'mobile' || e.surface === 'vscode') {
      const { Text } = $.ui.resolve(e)
      return <Text>{describe(s)}{'\n\n'}Edit in the terminal or desktop app.</Text>
    }

    const { Box, Button, Input, Select, Text } = $.ui.resolve(e)
    const width = Math.max(...FIELDS.map(f => f.label.length)) + 1
    const set = (key: Key, value: string) => save($, old => ({ ...old, [key]: value }))

    const body = active === 'presets'
      ? (
          <Box flexDirection="column" gap={1}>
            <Text dimColor>Presets layer on top of what you have. Reset first for a clean slate.</Text>
            <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
              {Object.keys(PRESETS).map(name => (
                <Button key={`preset-${name}`} label={name} onPress={() => void save($, old => ({ ...old, ...PRESETS[name] }))} />
              ))}
            </Box>
            <Text dimColor>{'Yours bring back exactly the look you saved. /clawdify delete <name> removes one.'}</Text>
            {mine.length
              ? (
                  <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
                    {mine.map(name => (
                      <Button key={`mine-${name}`} label={name} onPress={() => void run($, `preset ${name}`)} />
                    ))}
                  </Box>
                )
              : null}
            <Input
              key="save-as"
              label="Save current as"
              placeholder="my-look"
              value=""
              submitLabel="save"
              onSubmit={value => void run($, `save ${value}`).then(text => $.ui.toast(text))}
            />
            <Box flexDirection="row" columnGap={1}>
              <Button key="export" label="copy JSON" onPress={() => void run($, 'export').then(() => $.ui.toast('Settings copied'))} />
              <Button key="reset" label="reset all" onPress={() => void save($, () => DEFAULTS)} />
            </Box>
            <Text dimColor>{describe(s)}</Text>
          </Box>
        )
      : (
          <Box flexDirection="column">
            {FIELDS.filter(f => f.tab === active).map((f, i) =>
              f.options
                ? (
                    <Select
                      key={f.key}
                      label={f.label.padEnd(width)}
                      value={s[f.key] || 'default'}
                      options={f.options.map(o => ({ value: o || 'default', label: o || 'default' }))}
                      onSelect={value => void set(f.key, value === 'default' ? '' : value)}
                    />
                  )
                : (
                    <Input
                      key={f.key}
                      label={f.label.padEnd(width)}
                      placeholder={f.hint}
                      value={s[f.key]}
                      submitLabel="save"
                      autoFocus={i === 0 ? true : undefined}
                      onSubmit={value => void set(f.key, value)}
                    />
                  ),
            )}
          </Box>
        )

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          {TABS.map((name, i) => (
            <Button
              key={`tab-${name}`}
              label={name}
              hotkey={String(i + 1)}
              variant={name === active ? 'primary' : undefined}
              onPress={() => void update($, tab, () => name)}
            />
          ))}
        </Box>
        {body}
        <Text dimColor>Empty = Claude Code default · lists are comma-separated · tokens {'{model} {cwd} {time} {date}'}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    // ponytail: desktop's word describes the current step, so leave it alone there.
    if (e.surface !== 'terminal') return next(e)
    const s = await current($)
    const field = SPINNER_FIELD[e.props.mode]
    const verbs = list(field ? s[field] : '').length ? list(field ? s[field] : '') : list(s.spinnerVerbs)
    const props = { ...e.props }
    if (verbs.length) props.word = pick(verbs, e.props.word)
    if (s.spinnerSuffix) props.suffix = s.spinnerSuffix.includes('{clawd}') ? s.spinnerSuffix.replaceAll('{clawd}', tinyClawd(Math.floor((await read($, frame)) / 250))) : s.spinnerSuffix
    return next({ ...e, props })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const s = await current($)
    const verbs = list(s.doneVerbs)
    const word = verbs.length ? pick(verbs, e.props.word + e.requestId) : e.props.word
    if (!s.doneTemplate.trim()) return verbs.length ? next({ ...e, props: { ...e.props, word } }) : next(e)
    const ctx = await read($, context)
    const { Text } = $.ui.resolve(e)
    const text = fill(s.doneTemplate, ctx, { word, time: duration(e.props.durationMs) })
    return s.doneColor ? <Text color={s.doneColor}>{text}</Text> : <Text dimColor>{text}</Text>
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const s = await current($)
    if (unclawd(s.footer)) {
      const ctx = await read($, context)
      const { Box, Text } = $.ui.resolve(e)
      const hint = s.hint && !e.props.isDraft && !e.props.isWorking ? s.hint : e.props.hint
      const tail = s.hintTail.trim() ? ` · ${s.hintTail.trim()}` : ''
      const segments = fill(unclawd(s.footer), ctx).split('·').map(part => part.trim()).filter(Boolean)
      return (
        <Box flexDirection="row" columnGap={1}>
          {segments.flatMap((segment, i) => {
            const color = heat(segment) ?? (s.footerColor || undefined)
            const text = color ? <Text key={`seg-${i}`} color={color}>{segment}</Text> : <Text key={`seg-${i}`} dimColor>{segment}</Text>
            return i ? [<Text key={`sep-${i}`} dimColor>·</Text>, text] : [text]
          })}
          {hint.trim() ? <Text key="hint" dimColor>{`  ${hint.trim()}${tail}`}</Text> : null}
        </Box>
      )
    }
    const props = { ...e.props }
    if (s.hint && !e.props.isDraft && !e.props.isWorking) props.hint = s.hint
    if (s.hintTail.trim()) props.tail = ` · ${s.hintTail.trim()}`
    return next({ ...e, props })
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const label = (await current($)).modeLabel.trim()
    return label ? next({ ...e, props: { modes: [...e.props.modes, label] } }) : next(e)
  })

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
    const hint = (await current($)).backgroundHint.trim()
    if (!hint) return next(e)
    return next({ ...e, props: { ...e.props, hint: hint === 'none' ? '' : hint } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await current($)
    if ((!s.banner.trim() && !s.mascot) || e.props.hasSurvey) return next(e)
    const ctx = await read($, context)
    const { Box, Text } = $.ui.resolve(e)
    const crab = CRABS[s.mascot]
    const animated = s.mascot === 'animated' || !!crab
    const ms = animated ? await read($, frame) : 0
    const n = Math.floor(ms / 250)
    const working = animated && e.props.isWorking
    const justify = s.bannerAlign === 'center' ? 'center' : s.bannerAlign === 'right' ? 'flex-end' : 'flex-start'
    const text = fill(s.banner, ctx)
    return (
      <Box
        width={e.props.bodyColumns}
        justifyContent={justify}
        alignItems="center"
        columnGap={1}
        borderStyle={s.bannerBorder || undefined}
        borderColor={s.bannerBorder && s.bannerColor ? s.bannerColor : undefined}
      >
        {s.mascot
          ? (
              <Box
                flexDirection="column"
                width={crab ? crab.frames[0]?.[0]?.length ?? 9 : animated ? 15 : 9}
                paddingLeft={working && !crab ? scuttle(n, 6) : 0}
              >
                {(crab ? (working ? crabFrame(crab, ms) : s.mascot in FRIENDS ? crab.frames[0]! : crabFrame(CRABS.idle!, ms)) : clawd(n, working)).map((row, i) => <Text key={`clawd-${i}`} color={s.mascotColor || '#d77757'}>{row}</Text>)}
              </Box>
            )
          : null}
        {text.trim() ? (s.bannerColor ? <Text color={s.bannerColor}>{text}</Text> : <Text dimColor>{text}</Text>) : null}
      </Box>
    )
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const s = await current($)
    if (e.props.origin.kind !== 'composer' || (!s.userPrefix && !s.userColor)) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const color = s.userColor || undefined
    return (
      <Box flexDirection="row" columnGap={1}>
        <Text color={color} bold>{s.userPrefix || '>'}</Text>
        <Text color={color}>{e.props.text}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const rules = (await current($)).replyRewrites
    return rules.trim() ? next({ ...e, props: { ...e.props, text: rewrite(e.props.text, rules) } }) : next(e)
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const expand = (await current($)).expandToolGroups === 'on'
    return expand && !e.props.isExpanded ? next({ ...e, props: { ...e.props, isExpanded: true } }) : next(e)
  })

  on('ui.render', { component: 'InfoNotice' }, async ($, e, next) => {
    if ((await current($)).hideNotices !== 'on') return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box display="none" />
  })
}
