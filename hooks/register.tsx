import { atom, read, update } from 'claude-code'
import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { scene } from './scene'

const percent = atom({ plugin: 'winter-camp', key: 'percent' } as const, 0)

const { theme, problems } = makeColors({
  label: 'Winter camp',
  only: 'dark',
  roles: { accent: '#6f9fe8', danger: '#d9605a', success: '#5fae7a', warning: '#d9a441', pro: '#a48be0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0b1020',
        'surface-1': '#10172c',
        'surface-2': '#151d36',
        'surface-3': '#19223d',
        'text-primary': '#e8edf7',
        'text-secondary': '#c3cbdd',
        'text-muted': '#9ea9c0',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'winter-camp', glass: { blur: 8, tint: '#0b1020', opacity: 0.45 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await $.theme.set(LOOK)
    const { context } = await $.session.usage()
    await update($, percent, () => context.percent ?? 0)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const now = e.context.percent
    // 値が同じなら書かない。書くと再描画され、星のまたたきが最初からになる。
    if (now !== undefined && now !== (await read($, percent))) {
      await update($, percent, () => now)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const used = await read($, percent)

    return (
      <Svg
        source={scene(used / 100)}
        alt={`冬の夜のキャンプ場。山並みの上に星空と月。context 利用率 ${used}% の分だけ月が満ちている`}
        isInteractive
      />
    )
  })
}
