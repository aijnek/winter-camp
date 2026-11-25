/** context 利用率、0〜100 の整数。 */
export type ContextPercent = number

declare module 'claude-code' {
  interface PluginState {
    'winter-camp': { percent: ContextPercent }
  }
}
