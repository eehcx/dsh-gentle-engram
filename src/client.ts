import React, { useEffect, useState, useCallback } from 'react'
import { es, en, translate, type Messages } from './client-locales.ts'

const e = React.createElement

export const name = 'dsh-gentle-engram'
export const inject = ['slots', 'locale']

const NS = 'settings.engram'

interface ServerHealth {
  status: 'online' | 'offline' | 'checking'
  instanceId?: string
  port?: number
  version?: string
}

interface ServerStats {
  projectsCount?: number
  observationsCount?: number
  sessionsCount?: number
}

interface PluginSettings {
  ambientMemory: boolean
  capturePrompts: boolean
  captureToolResults: boolean
  contextLimit: number
}

const DEFAULT_SETTINGS: PluginSettings = {
  ambientMemory: true,
  capturePrompts: true,
  captureToolResults: true,
  contextLimit: 8000,
}

const STORAGE_KEY = 'dsh:engram:settings'

function loadSavedSettings(): PluginSettings {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: PluginSettings): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }
  } catch {
    // ignore
  }
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    width: '100%',
    maxWidth: '640px',
    color: 'var(--dsw-alias-label-primary)',
    fontFamily: 'inherit',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  intro: {
    margin: 0,
    color: 'var(--dsw-alias-label-tertiary)',
    fontSize: '13px',
    lineHeight: '20px',
  },
  section: {
    padding: '12px 14px',
    border: '0.5px solid var(--dsw-alias-settings-card-stroke, var(--dsw-alias-border-l4, var(--dsw-alias-border-l2)))',
    borderRadius: 'var(--dsw-radius-xl, 20px)',
    background: 'var(--dsw-alias-settings-card-fill, var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1)))',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '22px',
    fontWeight: 500,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '11px 0',
    borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
  },
  rowLabel: { fontSize: '13px', lineHeight: '20px', fontWeight: 500 },
  hint: {
    margin: '2px 0 0',
    color: 'var(--dsw-alias-label-tertiary)',
    fontSize: '12px',
    lineHeight: '18px',
  },
  control: {
    boxSizing: 'border-box' as const,
    height: '34px',
    flexShrink: 0,
    border: '0.5px solid var(--dsw-alias-border-l4, var(--dsw-alias-border-l2))',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-1))',
    color: 'var(--dsw-alias-label-primary)',
    font: 'inherit',
    fontSize: '13px',
  },
  button: {
    boxSizing: 'border-box' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '28px',
    flexShrink: 0,
    padding: '0 10px',
    border: '0.5px solid var(--dsw-alias-border-l3, var(--dsw-alias-border-l2))',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    color: 'var(--dsw-alias-label-primary)',
    font: 'inherit',
    fontSize: '12px',
    lineHeight: '18px',
    cursor: 'pointer',
  },
  banner: {
    padding: '14px',
    border: '0.5px solid var(--dsw-alias-border-l3, var(--dsw-alias-border-l2))',
    borderRadius: 'var(--dsw-radius-lg, 16px)',
    background: 'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1))',
    marginTop: '12px',
  },
  codeSnippet: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '6px 10px',
    marginTop: '6px',
    marginBottom: '8px',
    background: 'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-1))',
    border: '0.5px solid var(--dsw-alias-border-l2)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    fontFamily: 'monospace',
    fontSize: '12px',
    overflowX: 'auto' as const,
  },
}

export const settingsUiCss = `
.engram-settings { color-scheme: light; }
body[data-ds-dark-theme] .engram-settings { color-scheme: dark; }
.engram-settings button:hover:not(:disabled):not([role="switch"]) { background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-3)); }
.engram-settings button:active:not(:disabled):not([role="switch"]) { background: var(--dsw-alias-interactive-bg-active, var(--dsw-alias-bg-layer-3)); }
.engram-settings button:disabled { opacity: .45; cursor: default; }
.engram-settings button:focus-visible,
.engram-settings input:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary))); outline-offset: 2px; }
.engram-settings input[type="checkbox"] { width: 16px; height: 16px; margin: 0; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; }
.engram-settings input[type="number"] { width: 104px; padding: 0 10px; text-align: right; font-variant-numeric: tabular-nums; }
.engram-settings [role="switch"] { width: 36px; height: 20px; padding: 0; border: 0; border-radius: 999px; background: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-1)); position: relative; }
.engram-settings [role="switch"][aria-checked="true"] { background: var(--dsw-alias-brand-primary); }
.engram-settings [role="switch"] span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--dsw-alias-label-primary-foreground, var(--dsw-alias-bg-layer-1)); transition: transform 150ms ease-out; }
.engram-settings [role="switch"][aria-checked="true"] span { transform: translateX(16px); }
.engram-settings [role="status"] { color: var(--dsw-alias-state-success-primary); font-size: 12px; }
.engram-settings .engram-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.engram-settings .engram-stat { padding: 0 14px; border-right: .5px solid var(--dsw-alias-border-l2); }
.engram-settings .engram-stat:first-child { padding-left: 0; }
.engram-settings .engram-stat:last-child { padding-right: 0; border-right: 0; }
.engram-settings .engram-stat-label { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.engram-settings .engram-stat-value { margin-top: 2px; font-size: 16px; line-height: 24px; font-weight: 500; font-variant-numeric: tabular-nums; }
@media (max-width: 520px) {
  .engram-settings .engram-stats { grid-template-columns: 1fr; gap: 10px; }
  .engram-settings .engram-stat, .engram-settings .engram-stat:first-child, .engram-settings .engram-stat:last-child { padding: 0; border: 0; }
  .engram-settings .engram-stat { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
}
@media (prefers-reduced-motion: reduce) { .engram-settings [role="switch"] span { transition: none; } }
`

export function EngramSettingsView(props: { ctx?: any; t?: (key: keyof Messages, params?: Record<string, string | number>) => string }) {
  const [health, setHealth] = useState<ServerHealth>({ status: 'checking', port: 7437 })
  const [stats, setStats] = useState<ServerStats | null>(null)
  const [settings, setSettings] = useState<PluginSettings>(loadSavedSettings)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Language translation helper: prefer props.t or ctx.locale.bind(NS), else fallback translate
  const t = useCallback(
    (key: keyof Messages, params?: Record<string, string | number>): string => {
      if (typeof props.t === 'function') {
        return props.t(key, params)
      }
      try {
        if (typeof props.ctx?.locale?.bind === 'function') {
          const bound = props.ctx.locale.bind(NS)
          const res = bound(key, params)
          if (res) return res
        }
      } catch {
        // ignore
      }
      return translate(key, params, props.ctx?.locale?.preference ?? 'en')
    },
    [props.t, props.ctx],
  )

  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(null), 2000)
      }).catch(() => {
        // ignore
      })
    }
  }

  const checkServer = useCallback(async () => {
    setHealth((prev) => ({ ...prev, status: 'checking' }))
    try {
      const res = await fetch('http://127.0.0.1:7437/health', {
        signal: AbortSignal.timeout(1500),
      })
      if (res.ok) {
        const data = (await res.json()) as { instance_id?: string; version?: string }
        setHealth({
          status: 'online',
          port: 7437,
          instanceId: data.instance_id,
          version: data.version ?? '3.6.2+',
        })
        try {
          const statsRes = await fetch('http://127.0.0.1:7437/stats', {
            signal: AbortSignal.timeout(1500),
          })
          if (statsRes.ok) {
            const statsData = (await statsRes.json()) as Record<string, unknown>
            setStats({
              projectsCount: typeof statsData.projects === 'number' ? statsData.projects : undefined,
              observationsCount: typeof statsData.observations === 'number' ? statsData.observations : undefined,
              sessionsCount: typeof statsData.sessions === 'number' ? statsData.sessions : undefined,
            })
          }
        } catch {
          // stats optional
        }
        return
      }
    } catch {
      // offline
    }
    setHealth({ status: 'offline', port: 7437 })
    setStats(null)
  }, [])

  useEffect(() => {
    checkServer()
  }, [checkServer])

  const updateSetting = <K extends keyof PluginSettings>(key: K, value: PluginSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      try {
        if (props.ctx?.settingsScope) {
          const scope = props.ctx.settingsScope.bind({ namespace: 'engram' })
          scope?.update?.({ [key]: value })
        }
      } catch {
        // ignore
      }
      return next
    })
    setSavedNotice(t('savedNotice'))
    setTimeout(() => setSavedNotice(null), 2500)
  }

  const renderToggle = (label: string, description: string, checked: boolean, onToggle: () => void) =>
    e(
      'div',
      { style: styles.row },
      e(
        'div',
        { style: { minWidth: 0, flex: 1 } },
        e('div', { style: styles.rowLabel }, label),
        e('p', { style: styles.hint }, description),
      ),
      e(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': checked,
          'aria-label': label,
          onClick: onToggle,
          style: { ...styles.button, border: 0, minHeight: 0, padding: 0 },
        },
        e('span'),
      ),
    )

  const healthLabel = health.status === 'online'
    ? t('statusOnline', { port: health.port ?? 7437 })
    : health.status === 'checking'
      ? t('statusChecking')
      : t('statusOffline')
  const healthColor = health.status === 'online'
    ? 'var(--dsw-alias-state-success-primary)'
    : health.status === 'checking'
      ? 'var(--dsw-alias-state-warn-label)'
      : 'var(--dsw-alias-label-tertiary)'

  return e(
    'div',
    { className: 'engram-settings', style: styles.root },
    e('style', null, settingsUiCss),
    e('p', { style: styles.intro }, t('intro')),
    e(
      'section',
      { style: styles.section, 'aria-label': t('serviceStatus') },
      e(
        'div',
        { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' } },
        e(
          'div',
          { style: { minWidth: 0 } },
          e('h2', { style: { ...styles.sectionTitle, fontSize: '15px' } }, t('serviceStatus')),
          e(
            'p',
            { style: { ...styles.hint, marginTop: '3px', color: healthColor }, role: 'status', 'aria-live': 'polite' },
            healthLabel,
          ),
          e(
            'p',
            { style: styles.hint },
            health.status === 'online'
              ? t('instanceInfo', {
                  instance: health.instanceId ? `${health.instanceId.slice(0, 12)}…` : 'local',
                  version: health.version ?? 'active',
                })
              : t('mcpBridgeNotice'),
          ),
        ),
        e(
          'button',
          { type: 'button', onClick: checkServer, disabled: health.status === 'checking', style: styles.button },
          health.status === 'checking' ? t('checking') : t('refresh'),
        ),
      ),
      stats && e(
        'div',
        { className: 'engram-stats', style: { borderTop: '0.5px solid var(--dsw-alias-border-l2)', marginTop: '12px', paddingTop: '12px' } },
        ...([
          [t('statsProjects'), stats.projectsCount],
          [t('statsObservations'), stats.observationsCount],
          [t('statsSessions'), stats.sessionsCount],
        ] as const).map(([label, value]) => e(
          'div',
          { className: 'engram-stat', key: label },
          e('div', { className: 'engram-stat-label' }, label),
          e('div', { className: 'engram-stat-value' }, value ?? '—'),
        )),
      ),
      // If service is offline, provide instructions to install or run Engram
      health.status === 'offline' && e(
        'div',
        { style: styles.banner },
        e('div', { style: { fontWeight: 500, fontSize: '13px', marginBottom: '4px' } }, t('installGuideTitle')),
        e('p', { style: styles.hint }, t('notInstalledBannerDesc')),
        
        e('div', { style: { marginTop: '10px' } },
          e('div', { style: { ...styles.hint, color: 'var(--dsw-alias-label-secondary)' } }, t('installGuideStepBrew')),
          e(
            'div',
            { style: styles.codeSnippet },
            e('code', { style: { color: 'var(--dsw-alias-label-primary)' } }, t('brewInstallCommand')),
            e(
              'button',
              {
                type: 'button',
                style: styles.button,
                onClick: () => copyToClipboard(t('brewInstallCommand'), 'brew'),
              },
              copiedKey === 'brew' ? t('copiedCommand') : t('copyCommand'),
            ),
          ),
        ),

        e('div', { style: { marginTop: '8px' } },
          e('div', { style: { ...styles.hint, color: 'var(--dsw-alias-label-secondary)' } }, t('installGuideStepBinary')),
          e(
            'div',
            { style: styles.codeSnippet },
            e('code', { style: { color: 'var(--dsw-alias-label-primary)' } }, t('curlInstallCommand')),
            e(
              'button',
              {
                type: 'button',
                style: styles.button,
                onClick: () => copyToClipboard(t('curlInstallCommand'), 'curl'),
              },
              copiedKey === 'curl' ? t('copiedCommand') : t('copyCommand'),
            ),
          ),
        ),

        e(
          'div',
          { style: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end' } },
          e(
            'a',
            {
              href: 'https://github.com/Gentleman-Programming/engram',
              target: '_blank',
              rel: 'noopener noreferrer',
              style: {
                ...styles.button,
                textDecoration: 'none',
                color: 'var(--dsw-alias-state-business-primary, var(--dsw-alias-brand-primary))',
              },
            },
            t('openDocs'),
          ),
        ),
      ),
    ),
    e(
      'section',
      { style: styles.section, 'aria-labelledby': 'engram-memory-settings-title' },
      e(
        'div',
        { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '5px' } },
        e('h2', { id: 'engram-memory-settings-title', style: styles.sectionTitle }, t('behaviorSection')),
        savedNotice && e('span', { role: 'status', 'aria-live': 'polite' }, savedNotice),
      ),
      renderToggle(
        t('ambientMemoryTitle'),
        t('ambientMemoryDesc'),
        settings.ambientMemory,
        () => updateSetting('ambientMemory', !settings.ambientMemory),
      ),
      renderToggle(
        t('capturePromptsTitle'),
        t('capturePromptsDesc'),
        settings.capturePrompts,
        () => updateSetting('capturePrompts', !settings.capturePrompts),
      ),
      renderToggle(
        t('captureToolResultsTitle'),
        t('captureToolResultsDesc'),
        settings.captureToolResults,
        () => updateSetting('captureToolResults', !settings.captureToolResults),
      ),
      e(
        'div',
        { style: { ...styles.row, borderBottom: 0, paddingBottom: '2px' } },
        e(
          'div',
          { style: { minWidth: 0, flex: 1 } },
          e('label', { htmlFor: 'engram-context-limit', style: styles.rowLabel }, t('contextLimitTitle')),
          e('p', { style: styles.hint }, t('contextLimitDesc')),
        ),
        e('input', {
          id: 'engram-context-limit',
          type: 'number',
          min: 0,
          max: 100000,
          step: 1000,
          value: settings.contextLimit,
          onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
            updateSetting('contextLimit', Number(ev.target.value) || 0),
          style: styles.control,
        }),
      ),
    ),
  )
}

export function apply(ctx: any) {
  try {
    if (typeof ctx.effect === 'function' && typeof ctx.locale?.register === 'function') {
      ctx.effect(() => ctx.locale.register(NS, { es, en }), 'dsh-gentle-engram: copy dictionaries')
    }
  } catch {
    // ignore
  }

  const resolveLabel = () => {
    try {
      if (typeof ctx.locale?.bind === 'function') {
        const t = ctx.locale.bind(NS)
        return t('nav') || 'Engram Memory'
      }
    } catch {
      // ignore
    }
    return translate('nav', undefined, ctx.locale?.preference ?? 'en')
  }

  ctx.slots?.inject?.('settings.section', () => {
    return ctx.slots.register(
      {
        name: 'settings.section',
        id: 'engram',
        order: 85,
        label: resolveLabel,
        inject: () => ({ ctx }),
      },
      EngramSettingsView,
    )
  })

  ctx.slots?.inject?.('settings.plugins.tab', () => {
    return ctx.slots.register(
      {
        name: 'settings.plugins.tab',
        id: 'engram',
        order: 5,
        label: resolveLabel,
        inject: () => ({ ctx }),
      },
      EngramSettingsView,
    )
  })
}
