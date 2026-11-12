export interface Messages {
  nav: string
  intro: string
  serviceStatus: string
  checking: string
  refresh: string
  statusOnline: string
  statusOffline: string
  statusChecking: string
  instanceInfo: string
  mcpBridgeNotice: string
  statsProjects: string
  statsObservations: string
  statsSessions: string
  behaviorSection: string
  savedNotice: string
  ambientMemoryTitle: string
  ambientMemoryDesc: string
  capturePromptsTitle: string
  capturePromptsDesc: string
  captureToolResultsTitle: string
  captureToolResultsDesc: string
  contextLimitTitle: string
  contextLimitDesc: string
  notInstalledBannerTitle: string
  notInstalledBannerDesc: string
  installGuideTitle: string
  installGuideStepBrew: string
  installGuideStepBinary: string
  installGuideStepConfig: string
  copyCommand: string
  copiedCommand: string
  openDocs: string
  curlInstallCommand: string
  brewInstallCommand: string
}

export const es: Messages = {
  nav: 'Memoria Engram',
  intro: 'Memoria persistente para conservar contexto útil entre sesiones.',
  serviceStatus: 'Estado del servicio',
  checking: 'Comprobando…',
  refresh: 'Actualizar',
  statusOnline: 'Conectado · puerto {port}',
  statusOffline: 'API local inactiva · puente MCP disponible',
  statusChecking: 'Comprobando conexión…',
  instanceInfo: 'Instancia: {instance} · Versión {version}',
  mcpBridgeNotice: 'Las herramientas de Engram siguen disponibles mediante el puente MCP. La API HTTP es opcional.',
  statsProjects: 'Proyectos',
  statsObservations: 'Observaciones',
  statsSessions: 'Sesiones',
  behaviorSection: 'Comportamiento de memoria',
  savedNotice: 'Cambios guardados automáticamente',
  ambientMemoryTitle: 'Inyectar contexto al iniciar',
  ambientMemoryDesc: 'Añade recuerdos relevantes al inicio de una sesión y después de una compactación.',
  capturePromptsTitle: 'Guardar prompts del usuario',
  capturePromptsDesc: 'Conserva las peticiones del usuario para mantener continuidad entre sesiones.',
  captureToolResultsTitle: 'Guardar aprendizajes automáticamente',
  captureToolResultsDesc: 'Captura aprendizajes estructurados que el agente produce en sus respuestas.',
  contextLimitTitle: 'Límite de contexto',
  contextLimitDesc: 'Máximo de bytes de memoria que se añaden al contexto (predeterminado: 8.000).',
  notInstalledBannerTitle: '¿No tienes Engram instalado?',
  notInstalledBannerDesc: 'Engram proporciona memoria a largo plazo a través de herramientas MCP o servicio local.',
  installGuideTitle: 'Cómo instalar Engram',
  installGuideStepBrew: 'Con Homebrew (macOS / Linux):',
  installGuideStepBinary: 'Instalación rápida vía script:',
  installGuideStepConfig: 'O descarga el binario directamente desde GitHub:',
  copyCommand: 'Copiar',
  copiedCommand: '¡Copiado!',
  openDocs: 'Ver repositorio',
  curlInstallCommand: 'curl -fsSL https://raw.githubusercontent.com/Gentleman-Programming/engram/main/install.sh | bash',
  brewInstallCommand: 'brew install gentleman-programming/tap/engram',
}

export const en: Messages = {
  nav: 'Engram Memory',
  intro: 'Persistent memory to retain useful context across sessions.',
  serviceStatus: 'Service status',
  checking: 'Checking…',
  refresh: 'Refresh',
  statusOnline: 'Connected · port {port}',
  statusOffline: 'Local API inactive · MCP bridge available',
  statusChecking: 'Checking connection…',
  instanceInfo: 'Instance: {instance} · Version {version}',
  mcpBridgeNotice: 'Engram tools remain available via the MCP bridge. The HTTP API is optional.',
  statsProjects: 'Projects',
  statsObservations: 'Observations',
  statsSessions: 'Sessions',
  behaviorSection: 'Memory behavior',
  savedNotice: 'Changes saved automatically',
  ambientMemoryTitle: 'Inject context on session start',
  ambientMemoryDesc: 'Adds relevant memories at session start and after compaction.',
  capturePromptsTitle: 'Save user prompts',
  capturePromptsDesc: 'Preserves user requests to maintain continuity across sessions.',
  captureToolResultsTitle: 'Save learnings automatically',
  captureToolResultsDesc: 'Captures structured learnings produced by the agent in its responses.',
  contextLimitTitle: 'Context limit',
  contextLimitDesc: 'Maximum memory bytes added to context (default: 8,000).',
  notInstalledBannerTitle: 'Engram not installed?',
  notInstalledBannerDesc: 'Engram provides persistent memory via MCP tools or local HTTP service.',
  installGuideTitle: 'How to install Engram',
  installGuideStepBrew: 'Using Homebrew (macOS / Linux):',
  installGuideStepBinary: 'Quick installation script:',
  installGuideStepConfig: 'Or download prebuilt binary directly from GitHub:',
  copyCommand: 'Copy',
  copiedCommand: 'Copied!',
  openDocs: 'View repository',
  curlInstallCommand: 'curl -fsSL https://raw.githubusercontent.com/Gentleman-Programming/engram/main/install.sh | bash',
  brewInstallCommand: 'brew install gentleman-programming/tap/engram',
}

export const dictionaries: Record<string, Messages> = {
  es,
  en,
}

export function translate(key: keyof Messages, params?: Record<string, string | number>, locale = 'en'): string {
  const dict = dictionaries[locale] ?? dictionaries.en
  let text = dict[key] ?? en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}
