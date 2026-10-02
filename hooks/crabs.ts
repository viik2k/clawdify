// Stock Clawd loops, from the "Crab, at work" sheet: eight loops built only from Clawd's own glyphs.
// Every frame is 4 rows; row 0 is headroom for hops, thought bubbles and z's.

type Pose = { e?: keyof typeof EYES; a?: 'up' | 'down' | 'wave' | 'wave2'; l?: string }
type Stamp = readonly [rows: readonly string[], x: number, y: number]
export type Crab = { ms: number; frames: string[][] }

const EYES = { n: '▛███▜', b: '█████', l: '▛██▛█', r: '█▜██▜', u: '▙███▟', s: '▀███▀' }
const LA = '  ▘▘ ▝▝  '
const LB = '  ▝▝ ▘▘  '

const crab = (o: Pose = {}) => {
  const e = EYES[o.e ?? 'n']
  let r0 = ` ▐${e}▌ `
  let r1 = '▝▜█████▛▘'
  if (o.a === 'up') [r0, r1] = [`▗▐${e}▌▖`, ' ▜█████▛ ']
  if (o.a === 'wave') [r0, r1] = [`▗▐${e}▌ `, ' ▜█████▛▘']
  if (o.a === 'wave2') [r0, r1] = [`▝▐${e}▌ `, ' ▜█████▛▘']
  if (o.a === 'down') r1 = '▖▜█████▛▗'
  return [r0, r1, o.l ?? LA]
}

const canvas = (w: number, h: number, stamps: readonly Stamp[]) => {
  const g = Array.from({ length: h }, () => Array<string>(w).fill(' '))
  for (const [rows, x, y] of stamps) {
    rows.forEach((row, ri) => [...row].forEach((ch, ci) => {
      const line = g[y + ri]
      if (ch !== ' ' && line && x + ci >= 0 && x + ci < w) line[x + ci] = ch
    }))
  }
  return g.map(r => r.join(''))
}

const rep = <T>(f: T, n: number): T[] => Array<T>(n).fill(f)
const C = (o: Pose, w = 9, extra: Stamp[] = [], x = 0, y = 1) => canvas(w, 4, [[crab(o), x, y], ...extra])

const scuttle: string[][] = []
for (let x = 0; x <= 17; x++) scuttle.push(C({ e: 'r', l: x % 2 ? LB : LA }, 26, [], x))
scuttle.push(C({}, 26, [], 17), C({ e: 'b' }, 26, [], 17))
for (let x = 17; x >= 0; x--) scuttle.push(C({ e: 'l', l: x % 2 ? LB : LA }, 26, [], x))
scuttle.push(C({}, 26, [], 0), C({ e: 'b' }, 26, [], 0))

const b1: Stamp = [['·'], 10, 1]
const b2: Stamp = [['o'], 11, 0]
const b3: Stamp = [['O'], 13, 0]
const z1: Stamp = [['z'], 10, 1]
const z2: Stamp = [['Z'], 12, 0]
const z3: Stamp = [['z'], 14, 0]
const P = (o: Pose, y: number) => canvas(11, 4, [[crab(o), 1, y], [['───────────'], 0, 3]])

const CLAWDS: Record<string, Crab> = {
  idle: { ms: 200, frames: [
    ...rep(C({}), 8), C({ e: 'b' }), ...rep(C({}), 6), ...rep(C({ e: 'l' }), 4), ...rep(C({}), 2),
    ...rep(C({ e: 'r' }), 4), ...rep(C({}), 3), C({ e: 'b' }), C({}), C({ e: 'b' }), ...rep(C({}), 5),
  ] },
  scuttle: { ms: 110, frames: scuttle },
  hop: { ms: 120, frames: [
    ...rep(C({}), 4), C({ a: 'down', l: LB }), C({ a: 'up', e: 'u' }, 9, [], 0, 0), C({ a: 'up', e: 'u' }, 9, [], 0, 0),
    C({ e: 'u' }, 9, [], 0, 0), C({ a: 'down', l: LB }), ...rep(C({}), 3),
  ] },
  wave: { ms: 170, frames: [
    ...Array.from({ length: 6 }, () => [C({ a: 'wave', e: 'u' }), C({ a: 'wave2', e: 'u' })]).flat(),
    C({}), C({}), C({ e: 'b' }), ...rep(C({}), 5),
  ] },
  cheer: { ms: 160, frames: [
    ...Array.from({ length: 5 }, () => [C({ a: 'up', e: 'u', l: LA }), C({ a: 'down', e: 'u', l: LB })]).flat(),
    ...rep(C({}), 4),
  ] },
  think: { ms: 300, frames: [
    C({}, 15), C({ e: 'u' }, 15), C({ e: 'u' }, 15, [b1]), C({ e: 'u' }, 15, [b1, b2]),
    ...rep(C({ e: 'u' }, 15, [b1, b2, b3]), 4), C({ e: 'b' }, 15, [b1, b2, b3]), C({ e: 'u' }, 15, [b1, b2, b3]),
    C({ e: 'u' }, 15, [b2, b3]), C({ e: 'u' }, 15, [b3]), C({}, 15),
  ] },
  snooze: { ms: 400, frames: [
    C({ e: 's' }, 16), C({ e: 's', a: 'down' }, 16, [z1]), C({ e: 's' }, 16, [z1, z2]),
    C({ e: 's', a: 'down' }, 16, [z2, z3]), C({ e: 's' }, 16, [z3]), C({ e: 's', a: 'down' }, 16),
  ] },
  peek: { ms: 160, frames: [
    ...rep(P({}, 3), 4), ...rep(P({}, 2), 2), ...rep(P({ e: 'l' }, 2), 3), ...rep(P({ e: 'r' }, 2), 3),
    P({}, 2), P({}, 1), P({}, 0), ...rep(P({}, 0), 2), P({ e: 'b' }, 0), ...rep(P({}, 0), 3),
    P({ e: 'u', a: 'up' }, 0), P({ e: 'u', a: 'up' }, 0), P({}, 0), P({}, 1), P({}, 2), ...rep(P({}, 3), 2),
  ] },
}

// Friends, from the "Mega pack" sheet: twenty non-Clawd loops in the same 4-row box. Idle they hold their first frame.
const M = (n: number, m: number) => ((n % m) + m) % m
const tri = (i: number, a: number, b: number) => {
  const s = b - a
  const p = i % (2 * s)
  return a + (p <= s ? p : 2 * s - p)
}
const range = <T>(n: number, f: (i: number) => T) => Array.from({ length: n }, (_, i) => f(i))
const S = (rows: readonly string[], x = 0, y = 0): Stamp => [rows, x, y]
const F = (w: number, ...s: Stamp[]) => canvas(w, 4, s)
// 8 half-row levels per column, packed into 4 rows of ▀▄█.
const halfRows = (w: number, cols: number[][]) => {
  const g = Array.from({ length: 8 }, () => Array<number>(w).fill(0))
  cols.forEach((c, x) => c.forEach(l => { if (l >= 0 && l < 8 && x < w) g[l]![x] = 1 }))
  return range(4, r => range(w, x => {
    const t = g[2 * r]![x]
    const b = g[2 * r + 1]![x]
    return t && b ? '█' : t ? '▀' : b ? '▄' : ' '
  }).join(''))
}

const BTU = ['▚▖ ▄ ▗▞', ' ▜███▛ ', '  ▝ ▘  ']
const BTD = ['   ▄   ', '▄▟███▙▄', '▀ ▝ ▘ ▀']
const BN = ['    ▐▐ ', ' ▗▄▄█ █▖', '▐██████▘']
const BC = ['    ▗▗ ', BN[1]!, BN[2]!]
const BJ = [...BN, ' ▘    ▘']
const JA = ['▗▄███▄▖', '▀▀▀▀▀▀▀', ' ▚ ▞ ▚ ']
const JB = ['▗▄███▄▖', '▀▀▀▀▀▀▀', ' ▞ ▚ ▞ ']
const JC = [' ▄███▄ ', ' ▝███▘ ', '  ▐▐▌  ', '  ▌ ▐  ']
const DK = ['    ▗▄  ', '    █ █▄', '▙▄▄▟██▀ ']
const DP = ['', '', '▙▄▄▟██▄▖']
const TOP = ['███', '▄█▄', '▗▄▖', ' ▖ ', '   ']
const BOT = ['   ', ' ▄ ', '▗█▖', '▟█▙', '███']
const POT = ' ▜███▛ '
const STAGES = [['', '', '   ▖'], ['', '', '   ▌'], ['', '   ▌', '  ▚▌'], ['', '   ▌▞', '  ▚▌'], ['   ▖', '  ▚▌▞', '  ▚▌'], ['  ▟█▙', '  ▚▌▞', '  ▚▌']]
const FLAME = [['   ▗   ', '  ▟▓▖  ', ' ▐▓█▒▌ '], ['    ▖  ', '  ▗▓▙  ', ' ▐▒█▓▌ '], ['  ▗    ', '  ▟▒▓▖ ', ' ▐▓█▓▌ '], ['   ▖ ▗ ', ' ▗▓█▙  ', ' ▐█▓▒▌ ']]
const MOON = ['▗██▖', '████', '▝██▘']
const LIT = [[], [3], [2, 3], [1, 2, 3], [0, 1, 2, 3], [0, 1, 2], [0, 1], [0]]
const BEAT = [5, 5, 5, 5, 5, 5, 4, 5, 5, 6, 0, 7, 5, 5, 4, 4, 5, 5, 5, 5, 5, 5]
const SPD = [1, 2, 1, 3, 2, 1, 3, 2, 1]
const OFF = [0, 3, 5, 1, 6, 2, 4, 0, 3]

const dog = (t: boolean, e: boolean) => F(11, S([`${t ? '▖' : ' '}     ▄▄▄ `, `${t ? ' ' : '▝'}▄▄▄▄▄${e ? '█▄█' : '█ █'}▙`, ' ██████▀▀ ', ' ▌▐  ▌▐   ']))
const jelly = (r: string[], y: number) => F(7, S(r, 0, y))
const ripple = (i: number) => range(22, x => '▁▂▃▂'[(x + i) % 4]).join('')
const hourglass = (s: number) => F(7, S(['▀▀▀▀▀▀▀', ` ▚${TOP[s]}▞ `, ` ▞${BOT[s]}▚ `, '▄▄▄▄▄▄▄']))
const sine = (x: number) => Math.round(3.5 + 3.5 * Math.sin(x * 0.55))

export const FRIENDS: Record<string, Crab> = {
  snail: { ms: 120, frames: range(102, i => {
    const k = Math.floor(i / 3) % 2
    return F(24, S([k ? '  ▄▀▀▄  ▖▗' : '  ▄▀▀▄  ▗▖', ' █ ▄▖ █ ▐▌', '▄█▄▄▄▄█▄█▘'], M(Math.floor(i / 3), 34) - 10, 1))
  }) },
  bat: { ms: 140, frames: range(32, i => F(15, S(i % 2 ? BTD : BTU, tri(i, 0, 8), i % 2))) },
  spider: { ms: 200, frames: range(24, i => {
    const y = Math.floor(tri(i, 0, 11) / 4)
    return F(5, ...range(y, r => S(['│'], 2, r)), S(i % 2 ? ['╱▟█▙╲', '╲▀▀▀╱'] : ['╲▟█▙╱', '╱▀▀▀╲'], 0, y))
  }) },
  bunny: { ms: 110, frames: range(12, c => {
    const x = -8 + 3 * c
    return [...rep(F(26, S(BN, x, 1)), 3), F(26, S(BC, x, 1)), F(26, S(BJ, x + 1, 0)), F(26, S(BJ, x + 2, 0)), F(26, S(BC, x + 3, 1))]
  }).flat() },
  dog: { ms: 110, frames: range(24, i => dog(i % 2 === 1, i === 9 || i === 20)) },
  penguin: { ms: 150, frames: range(48, i => {
    const k = i % 2
    return F(18, S([' ▗▄▄▖ ', '▐█▘▝█▌', k ? '▞▌  ▐▌' : '▐▌  ▐▚', k ? ' ▀▘ ▀ ' : ' ▀ ▝▀ '], M(Math.floor(i / 2), 24) - 6))
  }) },
  snake: { ms: 90, frames: range(34, i => {
    const cols = range(24, (): number[] => [])
    for (let k = 0; k < 9; k++) {
      const x = i - k - 2
      if (x < 0 || x >= 24) continue
      cols[x]!.push(sine(x))
      if (k === 0) cols[x]!.push(Math.min(7, sine(x) + 1))
    }
    if (i % 2 && i >= 1 && i <= 24) cols[i - 1]!.push(sine(i - 2))
    return halfRows(24, cols)
  }) },
  jellyfish: { ms: 180, frames: [jelly(JA, 1), jelly(JB, 1), jelly(JA, 1), jelly(JB, 1), jelly(JC, 0), jelly(JC, 0), jelly(JB, 0), jelly(JA, 0), jelly(JB, 1), jelly(JA, 1)] },
  duck: { ms: 160, frames: range(24, i => F(22, S([ripple(i)], 0, 3), S(i >= 16 && i < 19 ? DP : DK, 7))) },
  turtle: { ms: 110, frames: range(102, i => {
    const k = Math.floor(i / 3) % 2
    return F(24, S(['  ▗▄▄▄▖   ', ' ▟▛▚▞▜▙ ▄▖', '▝▀▀▀▀▀▀▀█▘', k ? ' ▀▘  ▝▀ ' : '  ▀▘▝▀  '], M(Math.floor(i / 3), 34) - 10))
  }) },
  hourglass: { ms: 160, frames: [...range(5, s => rep(hourglass(s), 4)).flat(), ...rep(F(7, S(['', '█▙▄▄▄▟█', '█▛▀▀▀▜█'])), 2)] },
  plant: { ms: 200, frames: [
    ...STAGES.flatMap(s => rep(F(7, S([...s, POT])), 3)),
    ...range(10, i => F(7, S([i % 2 ? '   ▟█▙' : '  ▟█▙', '  ▚▌▞', '  ▚▌', POT]))),
  ] },
  campfire: { ms: 120, frames: range(12, i => F(7, S([...FLAME[i % 4]!, ' ▀▚▄▞▀ ']), ...(i % 5 === 2 ? [S(['·'], i % 2 ? 1 : 5)] : []))) },
  rain: { ms: 110, frames: range(32, i => {
    const bolt = i === 26 || i === 27
    const cloud = [' ▗▄██▄▄▖ ', '▐████████▌'].map(s => bolt ? s.replace(/█/g, '▓') : s)
    const drops = [2, 3].map(y => range(10, x => x > 0 && x < 9 && M(x * 3 + y - i, 4) === 0 ? '╷' : ' ').join(''))
    return F(10, S(cloud), ...(bolt ? [S(['▞', '▘'], 5, 2)] : [S(drops, 0, 2)]))
  }) },
  moon: { ms: 220, frames: range(24, i => {
    const lit = LIT[Math.floor(i / 3)]!
    const tw = i % 2
    const rows = MOON.map(r => [...r].map((c, ci) => lit.includes(ci) ? c : c === '█' ? '░' : ' ').join(''))
    return F(12, S(rows, 4), S([tw ? '*' : '·'], 1, 1), S([tw ? '·' : '*'], 10), S(['·'], 9, 3), S([tw ? '·' : ' '], 2, 3))
  }) },
  equalizer: { ms: 90, frames: range(60, i => {
    const cols = range(15, (): number[] => [])
    for (let b = 0; b < 8; b++) {
      const h = Math.max(1, Math.min(8, Math.round(4.5 + 3.5 * Math.sin(i * 0.35 * (1 + b * 0.17) + b * 1.3))))
      for (let l = 8 - h; l < 8; l++) cols[b * 2]!.push(l)
    }
    return halfRows(15, cols)
  }) },
  heartbeat: { ms: 70, frames: range(22, i => halfRows(22, range(22, x => {
    const a = BEAT[(x + i) % 22]!
    const b = BEAT[(x + i + 21) % 22]!
    return range(Math.abs(a - b) + 1, k => Math.min(a, b) + k)
  }))) },
  screensaver: { ms: 90, frames: range(76, i => F(24, S(['▗▄▄▄▖', '▝▀▀▀▘'], tri(i, 0, 19), tri(i, 0, 2)))) },
  'binary-rain': { ms: 100, frames: range(84, i => {
    const g = range(4, () => Array<string>(18).fill(' '))
    for (let c = 0; c < 9; c++) {
      const head = M(Math.floor(i / SPD[c]!) + OFF[c]!, 7)
      for (let y = Math.max(0, head - 2); y <= Math.min(3, head); y++) {
        g[y]![c * 2] = ((c * 7 + y * 3 + Math.floor(i / 3)) * 2654435761 >>> 0) % 2 ? '1' : '0'
      }
    }
    return g.map(r => r.join(''))
  }) },
  train: { ms: 80, frames: range(53, i => {
    const x = i - 22
    const w = i % 2 ? 'o' : '0'
    const car = ['▗▄▄▄▄▖', '▐████▌', `▝${w}▀▀${w}▘`]
    const smoke = range(3, k => i - i % 3 - 3 * k).filter(e => e >= 0).map(e => S([i - e < 3 ? '▒' : '░'], e - 7))
    return F(30, ...smoke, S(car, x, 1), S(['─'], x + 6, 2), S(car, x + 7, 1), S(['─'], x + 13, 2), S([' ▐▌ ▄▄▄ ', '▄██▄█ █▙', `▀${w}▀▀▀${w}▀▘`], x + 14, 1))
  }) },
}

// Every loop mascot can name: Clawd's own, then the friends.
export const CRABS: Record<string, Crab> = { ...CLAWDS, ...FRIENDS }

// Elapsed ms to the frame showing then.
export const crabFrame = (c: Crab, ms: number) => c.frames[Math.floor(ms / c.ms) % c.frames.length] ?? []
