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

export const CRABS: Record<string, Crab> = {
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

// Elapsed ms to the frame showing then.
export const crabFrame = (c: Crab, ms: number) => c.frames[Math.floor(ms / c.ms) % c.frames.length] ?? []
