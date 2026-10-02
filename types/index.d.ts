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
  backgroundHint: string
  banner: string
  bannerColor: string
  bannerBorder: string
  bannerAlign: string
  statusText: string
  userPrefix: string
  userColor: string
  replyRewrites: string
  expandToolGroups: string
  hideNotices: string
  persona: string
}

export type ClawdifyContext = { cwd: string; model: string; now: number }

declare module 'claude-code' {
  interface PluginState {
    clawdify: { settings: ClawdifySettings; tab: string; context: ClawdifyContext }
  }
}
