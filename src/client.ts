import React, { useEffect, useState, useCallback } from 'react'

const e = React.createElement

export const name = 'dsh-gentle-engram'
export const inject = ['slots', 'locale']

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

export function EngramSettingsView(props: { ctx?: any }) {
  const [health, setHealth] = useState<ServerHealth>({ status: 'checking', port: 7437 })
  const [stats, setStats] = useState<ServerStats | null>(null)
  const [settings, setSettings] = useState<PluginSettings>(loadSavedSettings)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

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
    setSavedNotice('Guardado automáticamente')
    setTimeout(() => setSavedNotice(null), 2500)
  }

  // Helper to render a toggle row
  const renderToggle = (
    label: string,
    description: string,
    checked: boolean,
    onToggle: () => void,
  ) => {
    return e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '12px 0',
          borderBottom: '1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.06))',
        },
      },
      e(
        'div',
        { style: { maxWidth: '80%' } },
        e('div', { style: { fontWeight: 500, fontSize: '14px' } }, label),
        e(
          'div',
          {
            style: {
              fontSize: '12px',
              color: 'var(--dsw-alias-label-secondary, #a1a1aa)',
              marginTop: '4px',
              lineHeight: 1.4,
            },
          },
          description,
        ),
      ),
      e(
        'button',
        {
          role: 'switch',
          'aria-checked': checked,
          onClick: onToggle,
          style: {
            cursor: 'pointer',
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            background: checked
              ? 'var(--dsw-alias-brand-primary, #3b82f6)'
              : 'var(--dsw-alias-bg-layer-4, #52525b)',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          },
        },
        e('span', {
          style: {
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ffffff',
            transition: 'left 0.2s',
          },
        }),
      ),
    )
  }

  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        maxWidth: '720px',
        color: 'var(--dsw-alias-label-primary, #f4f4f5)',
        fontFamily: 'inherit',
      },
    },
    // Header card
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 20px',
          background: 'var(--dsw-alias-bg-layer-3, #27272a)',
          borderRadius: '12px',
          border: '1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.1))',
        },
      },
      e(
        'div',
        null,
        e(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          e('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600 } }, 'Engram Persistent Memory'),
          e(
            'span',
            {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 500,
                background:
                  health.status === 'online'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : health.status === 'checking'
                    ? 'rgba(234, 179, 8, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                color:
                  health.status === 'online'
                    ? '#22c55e'
                    : health.status === 'checking'
                    ? '#eab308'
                    : '#ef4444',
              },
            },
            e('span', {
              style: {
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background:
                  health.status === 'online'
                    ? '#22c55e'
                    : health.status === 'checking'
                    ? '#eab308'
                    : '#ef4444',
              },
            }),
            health.status === 'online'
              ? `HTTP Conectado (puerto ${health.port})`
              : health.status === 'checking'
              ? 'Comprobando...'
              : 'Servidor HTTP inactivo (Puente MCP activo)',
          ),
        ),
        e(
          'p',
          {
            style: {
              margin: '6px 0 0',
              fontSize: '13px',
              color: 'var(--dsw-alias-label-secondary, #a1a1aa)',
            },
          },
          health.status === 'online'
            ? `Instancia: ${health.instanceId ? health.instanceId.slice(0, 12) + '...' : 'local'} · Versión: ${health.version ?? 'activa'}`
            : 'DSH ejecuta las herramientas mediante el puente MCP stdio de Engram. Puedes iniciar el servidor HTTP local con `engram serve` si requieres API web.',
        ),
      ),
      e(
        'button',
        {
          onClick: checkServer,
          style: {
            cursor: 'pointer',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '8px',
            background: 'var(--dsw-alias-bg-layer-4, #3f3f46)',
            color: 'inherit',
            border: '1px solid var(--dsw-alias-border-l4, rgba(255, 255, 255, 0.15))',
          },
        },
        'Refrescar',
      ),
    ),

    // Stats grid
    stats &&
      e(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          },
        },
        e(
          'div',
          {
            style: {
              padding: '14px',
              borderRadius: '10px',
              background: 'var(--dsw-alias-bg-layer-3, #27272a)',
              border: '1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08))',
            },
          },
          e('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #a1a1aa)' } }, 'Proyectos Registrados'),
          e('div', { style: { fontSize: '20px', fontWeight: 600, marginTop: '4px' } }, stats.projectsCount ?? '—'),
        ),
        e(
          'div',
          {
            style: {
              padding: '14px',
              borderRadius: '10px',
              background: 'var(--dsw-alias-bg-layer-3, #27272a)',
              border: '1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08))',
            },
          },
          e('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #a1a1aa)' } }, 'Observaciones Guardadas'),
          e('div', { style: { fontSize: '20px', fontWeight: 600, marginTop: '4px' } }, stats.observationsCount ?? '—'),
        ),
        e(
          'div',
          {
            style: {
              padding: '14px',
              borderRadius: '10px',
              background: 'var(--dsw-alias-bg-layer-3, #27272a)',
              border: '1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.08))',
            },
          },
          e('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary, #a1a1aa)' } }, 'Sesiones Registradas'),
          e('div', { style: { fontSize: '20px', fontWeight: 600, marginTop: '4px' } }, stats.sessionsCount ?? '—'),
        ),
      ),

    // Configuration Settings
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--dsw-alias-bg-layer-3, #27272a)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.1))',
        },
      },
      e(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        e('h3', { style: { margin: 0, fontSize: '15px', fontWeight: 600 } }, 'Comportamiento de Memoria'),
        savedNotice && e('span', { style: { fontSize: '12px', color: '#22c55e' } }, savedNotice),
      ),
      renderToggle(
        'Inyección de Memoria Inicial (ambientMemory)',
        'Inyecta automáticamente observaciones recientes al iniciar una sesión o tras compactación. Desactívalo para ahorrar tokens y recuperar memoria bajo demanda con mem_context o mem_search.',
        settings.ambientMemory,
        () => updateSetting('ambientMemory', !settings.ambientMemory),
      ),
      renderToggle(
        'Captura Automática de Prompts (capturePrompts)',
        'Registra los mensajes y peticiones del usuario en Engram para mantener el historial de intenciones entre sesiones.',
        settings.capturePrompts,
        () => updateSetting('capturePrompts', !settings.capturePrompts),
      ),
      renderToggle(
        'Captura Pasiva de Aprendizajes (captureToolResults)',
        'Extrae automáticamente hallazgos y notas estructuradas en encabezados ## Key Learnings: o ## Aprendizajes Clave:.',
        settings.captureToolResults,
        () => updateSetting('captureToolResults', !settings.captureToolResults),
      ),
      // contextLimit input
      e(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
          },
        },
        e(
          'div',
          { style: { maxWidth: '80%' } },
          e('div', { style: { fontWeight: 500, fontSize: '14px' } }, 'Límite de Bytes de Contexto (contextLimit)'),
          e(
            'div',
            {
              style: {
                fontSize: '12px',
                color: 'var(--dsw-alias-label-secondary, #a1a1aa)',
                marginTop: '4px',
              },
            },
            'Capacidad máxima del bloque inyectado (por defecto: 8000 bytes).',
          ),
        ),
        e('input', {
          type: 'number',
          min: 0,
          max: 100000,
          step: 1000,
          value: settings.contextLimit,
          onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
            updateSetting('contextLimit', Number(ev.target.value) || 0),
          style: {
            width: '100px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--dsw-alias-border-l4, rgba(255, 255, 255, 0.15))',
            background: 'var(--dsw-alias-bg-layer-4, #3f3f46)',
            color: 'inherit',
            fontSize: '13px',
            textAlign: 'right',
          },
        }),
      ),
    ),

    // Footer info card
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderRadius: '10px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          fontSize: '13px',
        },
      },
      e(
        'span',
        { style: { color: 'var(--dsw-alias-label-secondary, #a1a1aa)' } },
        '💡 ¿Deseas explorar o buscar recuerdos manualmente? Ejecuta ',
        e('code', null, 'engram tui'),
        ' en tu terminal.',
      ),
    ),
  )
}

export function apply(ctx: any) {
  ctx.slots?.inject?.('settings.section', () => {
    return ctx.slots.register(
      {
        name: 'settings.section',
        id: 'engram',
        order: 85,
        label: () => 'Engram Memory',
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
        label: () => 'Engram Memory',
        inject: () => ({ ctx }),
      },
      EngramSettingsView,
    )
  })
}
