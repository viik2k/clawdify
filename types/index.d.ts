export type ClawdifySettings = {
  spinnerVerbs: string
  spinnerThinking: string
  spinnerTools: string
  spinnerResponding: string
  spinnerSuffix: string
  doneVerbs: string
  doneTemplate: string
  doneColor: string
  doneToastSecs: string
  hint: string
  hintTail: string
  modeLabel: string
  footer: string
  footerColor: string
  backgroundHint: string
  banner: string
  bannerColor: string
  bannerBorder: string
  bannerAlign: string
  mascot: string
  mascotColor: string
  userPrefix: string
  userColor: string
  replyRewrites: string
  expandToolGroups: string
  hideNotices: string
  persona: string
}

// -1 = not known yet.
export type ClawdifyUsage = { branch: string; context: number; limit5h: number; limit7d: number; cost: number }
export type ClawdifyContext = ClawdifyUsage & { cwd: string; model: string; now: number }

declare module 'claude-code' {
  interface PluginState {
    clawdify: { settings: ClawdifySettings; presets: Record<string, Partial<ClawdifySettings>>; tab: string; context: ClawdifyContext; frame: number } // frame: ms of Clawd animation so far
  }
}
