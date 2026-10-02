import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ClawdifySettings } from '../types'
import { DEFAULTS, FIELDS, PRESETS, TABS, NO_USAGE, brief, unclawd, changed, clawd, clean, duration, fill, heat, isKey, list, parseChange, pick, rewrite, scuttle, tinyClawd } from './settings'
import type { Key, Tab } from './settings'

const PANE = 'clawdify'
const SETTINGS = { plugin: 'clawdify', key: 'settings' } as const

const settings = atom(SETTINGS, DEFAULTS)
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
  '/clawdify preset <name>      apply a preset on top: ' + Object.keys(PRESETS).join(', '),
  '/clawdify reset [key]        back to Claude Code defaults',
  '/clawdify export             copy your settings as JSON',
  '/clawdify import <json>      load settings from JSON',
  '/clawdify <anything else>    say what you want ("make it feel like a submarine"); Claude sets it',
  '',
  'Keys: ' + FIELDS.map(f => f.key).join(', '),
  'Template tokens: {model} {cwd} {path} {time} {date}; footer also {word} {time} = turn length.',
].join('\n')

type $ = EngineInterface

const current = async ($: $) => (await $.state.get(SETTINGS)).value ?? DEFAULTS

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
  const next = await update($, settings, change)
  await $.store.set('settings', changed(next))
  return next
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
      const preset = PRESETS[rest[0] ?? '']
      if (!preset) return `Presets: ${Object.keys(PRESETS).join(', ')}`
      await save($, old => ({ ...old, ...preset }))
      return `Applied preset "${rest[0]}".`
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
    const saved = clean(await $.store.get('settings'))
    await update($, settings, () => ({ ...DEFAULTS, ...saved }))
    const model = await $.session.model().catch(() => '')
    await update($, context, () => ({ cwd: e.cwd, model, now: 0, ...NO_USAGE }))
    await $.command.register({
      name: 'clawdify',
      description: 'Customise Claude Code: spinner, footer, hint, banner, status, transcript, persona',
      argumentHint: '[what you want | get | set <key> <value> | preset <name> | reset [key] | export | import <json>]',
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
    $.clock.every(15000, () => void refreshUsage($))
    $.clock.every(15000, () => void tick())
    // ponytail: one 250ms clock drives every Clawd, and only while one is animated; it redraws the band and spinner 4x a second.
    $.clock.every(250, async () => {
      const s = await current($)
      if (s.mascot === 'animated' || s.spinnerSuffix.includes('{clawd}')) await update($, frame, n => n + 1)
    })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
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
    if (e.args.trim()) return { text: await run($, e.args) }
    await $.ui.open({ id: PANE, title: 'clawdify', focus: true })
    return { text: 'clawdify open. Enter saves a field; an empty field restores the default. /clawdify help for commands.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await read($, settings)
    const active = (await read($, tab)) as Tab

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
    const s = await read($, settings)
    const field = SPINNER_FIELD[e.props.mode]
    const verbs = list(field ? s[field] : '').length ? list(field ? s[field] : '') : list(s.spinnerVerbs)
    const props = { ...e.props }
    if (verbs.length) props.word = pick(verbs, e.props.word)
    if (s.spinnerSuffix) props.suffix = s.spinnerSuffix.includes('{clawd}') ? s.spinnerSuffix.replaceAll('{clawd}', tinyClawd(await read($, frame))) : s.spinnerSuffix
    return next({ ...e, props })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const s = await read($, settings)
    const verbs = list(s.doneVerbs)
    const word = verbs.length ? pick(verbs, e.props.word + e.requestId) : e.props.word
    if (!s.doneTemplate.trim()) return verbs.length ? next({ ...e, props: { ...e.props, word } }) : next(e)
    const ctx = await read($, context)
    const { Text } = $.ui.resolve(e)
    const text = fill(s.doneTemplate, ctx, { word, time: duration(e.props.durationMs) })
    return s.doneColor ? <Text color={s.doneColor}>{text}</Text> : <Text dimColor>{text}</Text>
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const s = await read($, settings)
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
    const label = (await read($, settings)).modeLabel.trim()
    return label ? next({ ...e, props: { modes: [...e.props.modes, label] } }) : next(e)
  })

  on('ui.render', { component: 'ToolProgress' }, async ($, e, next) => {
    const hint = (await read($, settings)).backgroundHint.trim()
    if (!hint) return next(e)
    return next({ ...e, props: { ...e.props, hint: hint === 'none' ? '' : hint } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, settings)
    if ((!s.banner.trim() && !s.mascot) || e.props.hasSurvey) return next(e)
    const ctx = await read($, context)
    const { Box, Text } = $.ui.resolve(e)
    const animated = s.mascot === 'animated'
    const n = animated ? await read($, frame) : 0
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
              <Box flexDirection="column" width={animated ? 15 : 9} paddingLeft={working ? scuttle(n, 6) : 0}>
                {clawd(n, working).map((row, i) => <Text key={`clawd-${i}`} color={s.mascotColor || '#d77757'}>{row}</Text>)}
              </Box>
            )
          : null}
        {text.trim() ? (s.bannerColor ? <Text color={s.bannerColor}>{text}</Text> : <Text dimColor>{text}</Text>) : null}
      </Box>
    )
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const s = await read($, settings)
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
    const rules = (await read($, settings)).replyRewrites
    return rules.trim() ? next({ ...e, props: { ...e.props, text: rewrite(e.props.text, rules) } }) : next(e)
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const expand = (await read($, settings)).expandToolGroups === 'on'
    return expand && !e.props.isExpanded ? next({ ...e, props: { ...e.props, isExpanded: true } }) : next(e)
  })

  on('ui.render', { component: 'InfoNotice' }, async ($, e, next) => {
    if ((await read($, settings)).hideNotices !== 'on') return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box display="none" />
  })

  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    const persona = (await current($)).persona.trim()
    if (!persona) return result
    return {
      ...result,
      sections: [...result.sections, { id: 'clawdify:persona', text: persona, scope: 'session' as const }],
    }
  })
}
