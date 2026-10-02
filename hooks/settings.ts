import type { ClawdifyContext, ClawdifySettings, ClawdifyUsage } from '../types'
import { CRABS, FRIENDS } from './crabs'

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
  footer: '',
  footerColor: '',
  backgroundHint: '',
  banner: '',
  bannerColor: '',
  bannerBorder: '',
  bannerAlign: '',
  bannerAlign: '',
  mascot: '',
  mascotColor: '',
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
  { key: 'spinnerSuffix', tab: 'spinner', label: 'Suffix', hint: ' ~  (replaces the …; {clawd} = a scuttling Clawd)' },
  { key: 'doneVerbs', tab: 'turn', label: 'Done words', hint: 'Clawed, Snipped' },
  { key: 'doneTemplate', tab: 'turn', label: 'Footer template', hint: '✓ {word} in {time}' },
  { key: 'doneColor', tab: 'turn', label: 'Footer colour', hint: 'green, #ff8800, ansi:cyan' },
  { key: 'doneToastSecs', tab: 'turn', label: 'Toast after (s)', hint: '30 = toast when a turn ran 30s+' },
  { key: 'hint', tab: 'prompt', label: 'Hint (replace)', hint: 'replaces "? for shortcuts" when idle' },
  { key: 'hintTail', tab: 'prompt', label: 'Hint tail', hint: 'snip snip' },
  { key: 'modeLabel', tab: 'prompt', label: 'Mode label', hint: 'crab mode' },
  { key: 'footer', tab: 'prompt', label: 'Footer', hint: '{model} · {cwd} {branch} · ctx {ctxbar} {context} · 5h {5h} · {cost}' },
  { key: 'footerColor', tab: 'prompt', label: 'Footer colour', hint: '#d77757' },
  { key: 'backgroundHint', tab: 'prompt', label: 'ctrl+b pill', hint: '"none" hides it' },
  { key: 'banner', tab: 'banner', label: 'Banner', hint: '🦀 {model} · {cwd} · {time}' },
  { key: 'bannerColor', tab: 'banner', label: 'Banner colour', hint: 'magenta, #c15f3c' },
  { key: 'bannerBorder', tab: 'banner', label: 'Banner border', hint: '', options: ['', 'round', 'single', 'double', 'bold', 'classic'] },
  { key: 'bannerAlign', tab: 'banner', label: 'Banner align', hint: '', options: ['', 'center', 'right'] },
  { key: 'mascot', tab: 'banner', label: 'Clawd', hint: '', options: ['', 'still', 'animated', ...Object.keys(CRABS)] },
  { key: 'mascotColor', tab: 'banner', label: 'Clawd colour', hint: '#d77757 (Claude orange)' },
  { key: 'userPrefix', tab: 'transcript', label: 'Your prompt prefix', hint: '❯' },
  { key: 'userColor', tab: 'transcript', label: 'Your prompt colour', hint: 'cyan' },
  { key: 'replyRewrites', tab: 'transcript', label: 'Reply rewrites', hint: 'you=>ye; /\\bhello\\b/gi=>ahoy' },
  { key: 'expandToolGroups', tab: 'transcript', label: 'Expand tool groups', hint: '', options: ON_OFF },
  { key: 'hideNotices', tab: 'transcript', label: 'Hide startup notices', hint: '', options: ON_OFF },
  { key: 'persona', tab: 'persona', label: 'Persona', hint: 'Answer like a pirate.' },
]

// A friend's preset: its mascot, one colour everywhere, and theme leftovers from other presets cleared.
const friend = (mascot: string, colour: string, p: Partial<ClawdifySettings> & { persona: string }): Partial<ClawdifySettings> => ({
  spinnerSuffix: '',
  replyRewrites: '',
  userPrefix: '',
  bannerBorder: '',
  bannerAlign: '',
  mascot,
  mascotColor: colour,
  bannerColor: colour,
  doneColor: colour,
  footerColor: colour,
  userColor: colour,
  ...p,
  persona: `${p.persona} Keep code, commands and technical details exact.`,
})

export const PRESETS: Record<string, Partial<ClawdifySettings>> = {
  clawd: {
    spinnerVerbs: 'Clawing, Scuttling, Pinching, Sidestepping, Molting, Tinkering',
    spinnerThinking: 'Reckoning, Mulling it over, Having a squiz, Yarning with meself, Cooking up a ripper, Chewing the fat, Having a good ponder, Fair dinkum thinking',
    spinnerTools: 'Wrenching, Scuttling about, Giving it a burl, Whacking it on the barbie, Tinkering',
    spinnerResponding: 'Scribbling, Typing up a beauty, Spinning a yarn, Penning a ripper',
    spinnerSuffix: '',
    doneVerbs: 'Clawed, Snipped, Scuttled, Nailed it, Sorted',
    doneTemplate: '{word} in {time}, no worries',
    doneColor: '#d77757',
    hint: "she'll be right",
    hintTail: 'snip snip, legend',
    modeLabel: 'clawd mode',
    banner: "G'day! {model} · {cwd} · {time}",
    bannerColor: '#d77757',
    bannerBorder: 'round',
    bannerAlign: '',
    mascot: 'animated',
    mascotColor: '#d77757',
    footer: '{model} · {cwd} {branch} · ctx {ctxbar} {context} · 5h {5h} · 7d {7d} · {cost}',
    footerColor: '#d77757',
    userPrefix: '❯',
    userColor: '#d97757',
    persona: 'Warm, friendly and a touch cheeky, with light Australian flavour. Keep code, commands and technical details exact.',
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
  snail: friend('snail', '#c8a165', {
    spinnerVerbs: 'Inching, Oozing, Escargot-ing, Taking the scenic route',
    spinnerThinking: 'Contemplating at length, Considering every leaf, Mulling, très lentement',
    spinnerTools: 'Sliming along, Carrying the house, Edging forward',
    spinnerResponding: 'Writing in cursive, Composing at a stroll',
    spinnerSuffix: ' . . .',
    doneVerbs: 'Arrived, Got there eventually, Voilà, Slow and steady',
    doneTemplate: '🐌 {word}. Only took {time}.',
    hint: 'no rush',
    hintTail: 'slow is smooth, smooth is fast',
    modeLabel: 'snail mail',
    banner: '🐌 {model} is on its way to {cwd}… eventually',
    bannerBorder: 'round',
    userPrefix: '@',
    persona: 'Unhurried and deliberate, with a dash of French flair. Takes careful small steps and never rushes to a conclusion.',
  }),
  bat: friend('bat', '#8b5cf6', {
    spinnerVerbs: 'Echolocating, Hanging around, Flitting, Swooping',
    spinnerThinking: 'Listening for echoes, Sonar-sweeping, Pinging the dark',
    spinnerTools: 'Swooping in, Flitting between files, Snatching bugs mid-air',
    spinnerResponding: 'Squeaking back, Returning from the night',
    doneVerbs: 'Swooped, Roosted, Echoed back',
    doneTemplate: '🦇 {word} in {time}. Back to the belfry.',
    hint: 'finding bugs in the dark',
    hintTail: 'eeeeee (ultrasonic)',
    modeLabel: 'night shift',
    banner: '🦇 {model} haunting {cwd} at {time}',
    bannerBorder: 'double',
    userPrefix: '^v^',
    persona: 'A nocturnal debugger who hunts bugs by listening closely to what the code echoes back. Gothic flourishes welcome, briefly.',
  }),
  spider: friend('spider', '#b0aea5', {
    spinnerVerbs: 'Spinning, Weaving, Threading, Dangling',
    spinnerThinking: 'Mapping the web, Feeling for vibrations, Plotting strands',
    spinnerTools: 'Spinning silk, Weaving it together, Tying off threads',
    spinnerResponding: 'Writing on the web, Spelling it out in silk',
    doneVerbs: 'Woven, Spun, Caught one',
    doneTemplate: '🕸 {word} in {time}',
    hint: 'everything is connected',
    hintTail: 'mind the web',
    modeLabel: 'web dev (literally)',
    banner: '🕷 {model} weaving through {cwd}',
    bannerBorder: 'single',
    userPrefix: '╲╱',
    persona: 'Thinks in webs: always notes how a change connects to the rest of the codebase, callers and dependents included.',
  }),
  bunny: friend('bunny', '#f2b8c6', {
    spinnerVerbs: 'Hopping, Bounding, Binkying, Nibbling',
    spinnerThinking: 'Twitching whiskers, Sniffing around, Ears up',
    spinnerTools: 'Burrowing, Digging in, Hopping between files',
    spinnerResponding: 'Thumping out an answer, Hopping to it',
    doneVerbs: 'Hopped, Binkied, Burrowed through',
    doneTemplate: '🐇 {word} in {time}',
    hint: 'down the rabbit hole?',
    hintTail: 'hop to it',
    modeLabel: 'hop mode',
    banner: '🐇 {model} hopping round {cwd}',
    bannerBorder: 'round',
    persona: 'Bouncy and upbeat, but knows when a rabbit hole is a waste of time and says so.',
  }),
  dog: friend('dog', '#c68642', {
    spinnerVerbs: 'Fetching, Sniffing, Wagging, Being a good boy',
    spinnerThinking: 'Head tilting, Sniffing it out, Following the scent',
    spinnerTools: 'Fetching, Digging up the yard, Retrieving, Chewing on it',
    spinnerResponding: 'Bringing it back, Dropping it at your feet',
    doneVerbs: 'Fetched, Retrieved, Good boy, Who\'s a good boy',
    doneTemplate: '🐕 {word}! ({time}) *tail wags*',
    hint: 'throw me a task',
    hintTail: 'who\'s a good dev',
    modeLabel: 'good boy mode',
    banner: '🐕 {model} guarding {cwd}',
    bannerBorder: 'round',
    userPrefix: '🐾',
    persona: 'Loyal and enthusiastic like a good dog: eager to help, delighted to bring back results, and honest when it couldn\'t find the ball.',
  }),
  penguin: friend('penguin', '#6a9bcc', {
    spinnerVerbs: 'Waddling, Sliding, Huddling, Tobogganing',
    spinnerThinking: 'Huddling for warmth, Pondering the ice, Standing very still',
    spinnerTools: 'Belly-sliding, Diving in, Fishing',
    spinnerResponding: 'Waddling back, Squawking politely',
    doneVerbs: 'Waddled, Slid home, Dove in',
    doneTemplate: '🐧 {word} in {time}, dressed for the occasion',
    hint: 'stay cool',
    hintTail: 'black tie required',
    modeLabel: 'black tie',
    banner: '🐧 {model} on the ice at {cwd}',
    bannerBorder: 'bold',
    userPrefix: '$',
    persona: 'Impeccably formal and polite, like a penguin in a tuxedo, and cool under pressure. Fond of a good Linux one-liner.',
  }),
  snake: friend('snake', '#788c5d', {
    spinnerVerbs: 'Slithering, Coiling, Shedding, Hissing',
    spinnerThinking: 'Coiling up, Tasting the air, Basking',
    spinnerTools: 'Slithering through, Striking, Squeezing',
    spinnerResponding: 'Hisssssing, Uncoiling',
    spinnerSuffix: ' sss',
    doneVerbs: 'Ssssorted, Struck, Shed',
    doneTemplate: '🐍 {word} in {time}',
    hint: 'import this',
    hintTail: 'explicit is better than implicit',
    modeLabel: 'pythonic',
    banner: '🐍 {model} coiled around {cwd}',
    userPrefix: '>>>',
    replyRewrites: '/\\bYes\\b/g=>Yesss',
    persona: 'Sly and precise, and lives by the Zen of Python: explicit over implicit, simple over complex, readability counts.',
  }),
  jellyfish: friend('jellyfish', '#7fdbda', {
    spinnerVerbs: 'Drifting, Pulsing, Glowing, Floating',
    spinnerThinking: 'Drifting in thought, Going with the current, Pulsing gently',
    spinnerTools: 'Trailing tentacles, Stinging bugs, Pulsing along',
    spinnerResponding: 'Glowing softly, Surfacing',
    spinnerSuffix: ' ~',
    doneVerbs: 'Drifted in, Glowed, Surfaced',
    doneTemplate: '≋ {word} after {time} ≋',
    hint: 'no brain, no problem',
    hintTail: 'go with the flow',
    modeLabel: 'bioluminescent',
    banner: '≋ {model} drifting through {cwd} ≋',
    bannerAlign: 'center',
    persona: 'Serene and fluid. No ego, goes with the flow, and lights up when it finds something interesting.',
  }),
  duck: friend('duck', '#f5c542', {
    spinnerVerbs: 'Paddling, Quacking, Rubber-ducking, Waddling',
    spinnerThinking: 'Listening patiently, Rubber-ducking, Tilting head',
    spinnerTools: 'Paddling furiously below the surface, Dabbling, Preening the code',
    spinnerResponding: 'Quacking back, Explaining it to the duck',
    doneVerbs: 'Quacked, Ducked it, Paddled through',
    doneTemplate: '🦆 {word} in {time}. Calm on top.',
    hint: 'explain it to the duck',
    hintTail: 'quack',
    modeLabel: 'rubber duck',
    banner: '🦆 {model} · rubber duck on duty · {cwd}',
    bannerBorder: 'round',
    persona: 'A rubber duck that talks back: asks the one clarifying question that cracks the bug, and gets the user to explain their reasoning.',
  }),
  turtle: friend('turtle', '#5f9e6e', {
    spinnerVerbs: 'Plodding, Persevering, Basking, Shelling out',
    spinnerThinking: 'Retreating into shell, Thinking slowly but surely, Weighing it up',
    spinnerTools: 'Plodding along, Carrying the load, Steadily working',
    spinnerResponding: 'Poking head out, Delivering steadily',
    doneVerbs: 'Won the race, Plodded through, Shell-ebrated',
    doneTemplate: '🐢 {word} in {time}. Hare nowhere to be seen.',
    hint: 'slow and steady',
    hintTail: 'turtles all the way down',
    modeLabel: 'steady',
    banner: '🐢 {model} plodding through {cwd}',
    bannerBorder: 'bold',
    persona: 'Steady and patient, like the tortoise that beat the hare: thorough, tested, and no shortcuts that bite later.',
  }),
  hourglass: friend('hourglass', '#d4a85a', {
    spinnerVerbs: 'Waiting, Sifting, Trickling, Biding time',
    spinnerThinking: 'Counting grains, Watching the sand, Biding time',
    spinnerTools: 'Turning it over, Sifting through, Trickling',
    spinnerResponding: 'Running out the clock, Finishing the turn',
    doneVerbs: 'Time\'s up, Sifted, Turned over',
    doneTemplate: '⏳ {word}: {time} of sand',
    doneToastSecs: '30',
    hint: 'time is a flat circle',
    hintTail: 'tick tock',
    modeLabel: 'sands of time',
    banner: '⏳ {model} · {date} {time} · {cwd}',
    bannerBorder: 'classic',
    persona: 'Mindful of time: says up front what will be slow, and never wastes a turn.',
  }),
  plant: friend('plant', '#7cb342', {
    spinnerVerbs: 'Growing, Photosynthesising, Sprouting, Rooting',
    spinnerThinking: 'Putting down roots, Soaking up sun, Germinating',
    spinnerTools: 'Pruning, Grafting, Repotting, Watering',
    spinnerResponding: 'Blooming, Unfurling',
    doneVerbs: 'Bloomed, Sprouted, Grown',
    doneTemplate: '🌱 {word} in {time}',
    hint: 'water me with prompts',
    hintTail: 'touch grass',
    modeLabel: 'green thumb',
    banner: '🌱 {model} tending the {cwd} garden',
    bannerBorder: 'round',
    persona: 'A patient gardener: grows code a little at a time, happily prunes dead code, and leaves the codebase healthier than it found it.',
  }),
  campfire: friend('campfire', '#ff7a33', {
    spinnerVerbs: 'Crackling, Kindling, Toasting, Smouldering',
    spinnerThinking: 'Staring into the flames, Gathering kindling, Telling a story',
    spinnerTools: 'Stoking the fire, Throwing on a log, Toasting marshmallows',
    spinnerResponding: 'Spinning a yarn, Crackling away',
    doneVerbs: 'Toasted, Stoked, Roaring',
    doneTemplate: '🔥 {word} in {time}. Pass the marshmallows.',
    hint: 'pull up a log',
    hintTail: 'mind the embers',
    modeLabel: 'cosy',
    banner: '🔥 {model} round the fire at {cwd}',
    bannerBorder: 'round',
    persona: 'A warm storyteller round the campfire: explanations have a little narrative to them, but stay short and accurate.',
  }),
  rain: friend('rain', '#7aa2c8', {
    spinnerVerbs: 'Drizzling, Pouring, Pattering, Precipitating',
    spinnerThinking: 'Clouding over, Gathering, Brewing a storm',
    spinnerTools: 'Pouring down, Flooding the zone, Thundering',
    spinnerResponding: 'Pattering out, Clearing up',
    spinnerSuffix: ' ╷',
    doneVerbs: 'Rained, Cleared, Forecast confirmed',
    doneTemplate: '☔ {word} in {time} · clearing later',
    hint: 'cloudy with a chance of commits',
    hintTail: 'bring a brolly',
    modeLabel: 'forecast',
    banner: '☁ {model} over {cwd} · {time}',
    persona: 'A weather presenter: gives the outlook first (what will change, any chance of breakage), then the details.',
  }),
  moon: friend('moon', '#f0eee6', {
    spinnerVerbs: 'Waxing, Waning, Orbiting, Moonlighting',
    spinnerThinking: 'Gazing, Phasing, Reflecting',
    spinnerTools: 'Pulling the tides, Orbiting, Eclipsing',
    spinnerResponding: 'Shining back, Reflecting',
    doneVerbs: 'Full moon, Eclipsed, Orbited',
    doneTemplate: '☾ {word} in {time}',
    hint: 'night owls only',
    hintTail: 'the dark side is a feature',
    modeLabel: 'moonlighting',
    banner: '☾ {model} over {cwd} · {time}',
    bannerBorder: 'round',
    hideNotices: 'on',
    persona: 'A quiet late-night pair programmer: calm, reflective and low-key, never shouty.',
  }),
  equalizer: friend('equalizer', '#ff4fd8', {
    spinnerVerbs: 'Vibing, Mixing, Dropping the beat, Remixing',
    spinnerThinking: 'Finding the groove, Tuning up, Feeling the bass',
    spinnerTools: 'Scratching, Sampling, Mixing down, Mastering',
    spinnerResponding: 'Dropping it, Laying down tracks',
    spinnerSuffix: ' ♪',
    doneVerbs: 'Mastered, Dropped, Banger',
    doneTemplate: '♫ {word} in {time} ♫',
    hint: 'turn it up',
    hintTail: 'bpm: high',
    modeLabel: 'on air',
    banner: '♫ now playing: {model} · live from {cwd}',
    bannerBorder: 'bold',
    persona: 'A radio DJ: punchy intros, keeps the energy up, and the tracks (the code) are always clean.',
  }),
  heartbeat: friend('heartbeat', '#ff4d5e', {
    spinnerVerbs: 'Monitoring, Triaging, Stabilising, Diagnosing',
    spinnerThinking: 'Reading vitals, Checking the pulse, Running diagnostics',
    spinnerTools: 'Operating, Suturing, Administering a patch, Prescribing',
    spinnerResponding: 'Charting, Writing the discharge notes',
    doneVerbs: 'Stable, Discharged, Pulse restored',
    doneTemplate: '♥ {word} · {time} on the table',
    doneToastSecs: '60',
    hint: 'the patient is stable',
    hintTail: 'beep… beep…',
    modeLabel: 'on call',
    banner: '♥ {model} · ward {cwd} · {time}',
    bannerBorder: 'single',
    persona: 'An ER doctor for code: triage first (what is broken, how badly), stabilise, then give the diagnosis plainly.',
  }),
  screensaver: friend('screensaver', '#3fd0c9', {
    spinnerVerbs: 'Bouncing, Idling, Drifting, Almost hitting the corner',
    spinnerThinking: 'Calculating trajectory, Approaching the corner, So close',
    spinnerTools: 'Bouncing off walls, Changing colour, Ricocheting',
    spinnerResponding: 'Bouncing back, Rendering',
    doneVerbs: 'HIT THE CORNER, Bounced, Ricocheted',
    doneTemplate: '▣ {word} after {time}',
    hint: 'it will hit the corner. eventually.',
    hintTail: 'press any key',
    modeLabel: 'idle since 2003',
    banner: '▣ {model} · {cwd} · {date}',
    bannerBorder: 'classic',
    userPrefix: 'C:\\>',
    persona: 'Nostalgic for early-2000s computing, and celebrates small wins like the logo finally hitting the corner.',
  }),
  'binary-rain': friend('binary-rain', '#00ff41', {
    spinnerVerbs: 'Decoding, Following the white rabbit, Jacking in, Bending the spoon',
    spinnerThinking: 'Seeing the code, Choosing a pill, Dodging bullets',
    spinnerTools: 'Rewriting the Matrix, Jacking in, Downloading kung fu',
    spinnerResponding: 'Transmitting, Decoding',
    spinnerSuffix: ' █',
    doneVerbs: 'I know kung fu, Decoded, There is no spoon',
    doneTemplate: '[{word}] {time}',
    hint: 'follow the white rabbit',
    hintTail: 'wake up',
    modeLabel: 'the matrix',
    banner: 'wake up… {model} has you · {cwd}',
    bannerBorder: 'single',
    userPrefix: '>',
    persona: 'Cryptic but precise, like an operator in the Matrix who sees the code beneath everything.',
  }),
  train: friend('train', '#d0473a', {
    spinnerVerbs: 'Choo-chooing, Chugging, Steaming ahead, Full steam',
    spinnerThinking: 'Checking the timetable, Switching tracks, Stoking the boiler',
    spinnerTools: 'Laying track, Coupling carriages, Shunting',
    spinnerResponding: 'Pulling into the station, Announcing',
    doneVerbs: 'Arrived on time, All aboard, Pulled in',
    doneTemplate: '🚂 {word} · journey time {time}',
    hint: 'all aboard',
    hintTail: 'mind the gap',
    modeLabel: 'express',
    banner: '🚂 {model} express · next stop {cwd}',
    bannerBorder: 'double',
    persona: 'A cheery train conductor: announces each stop (step) of the plan and keeps things running on schedule.',
  }),
}

// Clawd, Claude Code's own mascot, as the welcome screen draws him. Idle he blinks now and then;
// working he scuttles, arms and legs swapping each frame.
const CLAWD = [' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  '] as const

export const clawd = (frame: number, isWorking: boolean) => {
  const step = isWorking && frame % 2 === 1
  return [
    !isWorking && frame % 16 === 15 ? ' ▐█████▌ ' : CLAWD[0],
    step ? '▗▜█████▛▖' : CLAWD[1],
    step ? '  ▝▝ ▘▘  ' : CLAWD[2],
  ]
}

// Crabs walk sideways: 0..span and back.
export const scuttle = (frame: number, span: number) => {
  const at = frame % (span * 2)
  return at <= span ? at : span * 2 - at
}

// The one-row Clawd for the spinner line, shuffling side to side.
export const tinyClawd = (frame: number) => ['▐▛███▜▌', ' ▐▛███▜▌', '  ▐▛███▜▌', ' ▐▛███▜▌'][frame % 4] ?? ''

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

export const NO_USAGE: ClawdifyUsage = { branch: '', context: -1, limit5h: -1, limit7d: -1, cost: -1 }

const pct = (n: number) => (n < 0 ? '–' : `${Math.round(n)}%`)
const bar = (n: number) => (n < 0 ? '' : '▰'.repeat(Math.round(n / 20)) + '▱'.repeat(5 - Math.round(n / 20)))

// Warm traffic light for a footer segment that carries a percentage: rust past 85, amber past 60.
export const heat = (segment: string) => {
  const n = Number(/(\d+)%/.exec(segment)?.[1] ?? -1)
  return n >= 85 ? '#c15f3c' : n >= 60 ? '#e8a33d' : undefined
}

export const fill = (template: string, ctx: ClawdifyContext, extra: Record<string, string> = {}) => {
  const d = new Date(ctx.now)
  const vars: Record<string, string> = {
    model: ctx.model,
    cwd: ctx.cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? ctx.cwd,
    path: ctx.cwd,
    clawd: CLAWD[0],
    branch: ctx.branch,
    context: pct(ctx.context),
    ctxbar: bar(ctx.context),
    '5h': pct(ctx.limit5h),
    '7d': pct(ctx.limit7d),
    cost: ctx.cost < 0 ? '' : `$${ctx.cost.toFixed(2)}`,
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
  // Up to 0.4 a separate status line sat under the prompt; it lives in the footer now.
  const status = (raw as Record<string, unknown>).statusText
  if (!out.footer && typeof status === 'string') out.footer = status
  return out
}

// The row under the prompt stays neat: no Clawd there, whether as the token, pasted art or the emoji.
export const unclawd = (text: string) =>
  text.replace(/\{clawd\}|[▐▛█▜▌▝▘▗▖▟▙]+|🦀/gu, '').replace(/ {2,}/g, ' ').trim()

export const isKey = (key: string): key is Key => key in DEFAULTS

export const changed = (settings: ClawdifySettings) => clean(
  Object.fromEntries(Object.entries(settings).filter(([key, value]) => value !== DEFAULTS[key as Key])),
)

// The user's own presets, from the store file: untrusted, so names are checked, built-in names skipped, settings cleaned.
export const PRESET_NAME = /^[\w-]{1,32}$/
export type Saved = Record<string, Partial<ClawdifySettings>>
export const cleanSaved = (raw: unknown): Saved => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' ? raw : {})
    .filter(([name]) => PRESET_NAME.test(name) && !(name in PRESETS))
    .map(([name, preset]) => [name, clean(preset)]),
)

// System prompt for /clawdify <request>: every setting, what it takes, and where things stand now.
export const brief = (s: ClawdifySettings) => [
  "You configure clawdify, a Claude Code mod that restyles the CLI. Turn the user's request into setting changes.",
  'Reply with ONE JSON object and nothing else: setting keys to string values, only the keys to change. "" restores Claude Code\'s default. Reply {} if nothing fits.',
  'Settings:',
  ...FIELDS.map(f => `- ${f.key} (${f.tab}): ${f.label}${f.options ? `; one of ${f.options.map(o => JSON.stringify(o)).join(', ')}` : `; e.g. ${f.hint}`}`),
  `The mascot is Clawd, Claude Code's own pixel crab, never the 🦀 emoji. mascot draws him above the prompt (animated: blinks idle, scuttles while working; a stock loop name plays that loop while working and glances about while idle: scuttle, hop, wave, cheer, think, snooze, peek, idle; or, only if the user wants something other than Clawd, a friend that plays its loop while working and holds still while idle: ${Object.keys(FRIENDS).join(", ")}), and that is the one place he goes. Only if the user asks for him somewhere specific, {clawd} is a one-row Clawd (animated in spinnerSuffix). Claude's colours are warm: #d77757 orange, #c15f3c rust, #f0eee6 cream.`,
  'footer replaces the row under the prompt (the line with "? for shortcuts"); segments split on " · ", tokens {branch} {context} {ctxbar} {5h} {7d} {cost} plus the template ones. Clawd is never drawn in the footer.',
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
