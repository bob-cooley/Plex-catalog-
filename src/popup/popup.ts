import { PlexClient, PlexApiError, PlexConnectionError } from '../plex/client'
import type { LibrarySection } from '../plex/types'
import { exportXlsx } from '../export/xlsx'
import { exportDocx } from '../export/docx'
import { exportPdf } from '../export/pdf'
import { exportRtf } from '../export/rtf'
import { exportTxt } from '../export/txt'
import { exportXml } from '../export/xml'

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const STORAGE_URL_KEY = 'plexUrl'
const STORAGE_TOKEN_KEY = 'plexToken'

// ---------------------------------------------------------------------------
// Element references
// ---------------------------------------------------------------------------
const inputUrl = document.getElementById('input-url') as HTMLInputElement
const inputToken = document.getElementById('input-token') as HTMLInputElement
const btnConnect = document.getElementById('btn-connect') as HTMLButtonElement
const btnShowManual = document.getElementById('btn-show-manual') as HTMLButtonElement
const manualEntry = document.getElementById('manual-entry') as HTMLElement
const btnDisconnect = document.getElementById('btn-disconnect') as HTMLButtonElement
const btnExport = document.getElementById('btn-export') as HTMLButtonElement
const sectionConnect = document.getElementById('section-connect') as HTMLElement
const sectionExport = document.getElementById('section-export') as HTMLElement
const labelServer = document.getElementById('label-server') as HTMLElement
const msgConnectError = document.getElementById('msg-connect-error') as HTMLElement
const msgExportStatus = document.getElementById('msg-export-status') as HTMLElement
const msgExportError = document.getElementById('msg-export-error') as HTMLElement

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let activeClient: PlexClient | null = null
let discoveredSections: LibrarySection[] = []

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  btnConnect.addEventListener('click', handleConnect)
  btnDisconnect.addEventListener('click', handleDisconnect)
  btnExport.addEventListener('click', handleExport)
  btnShowManual.addEventListener('click', () => {
    manualEntry.hidden = false
    btnShowManual.hidden = true
  })

  // Silent reconnect with saved credentials
  const stored = await chrome.storage.local.get([STORAGE_URL_KEY, STORAGE_TOKEN_KEY])
  const savedUrl = stored[STORAGE_URL_KEY] as string | undefined
  const savedToken = stored[STORAGE_TOKEN_KEY] as string | undefined
  if (savedUrl && savedToken) {
    await connectWith(savedUrl, savedToken)
  }
})

// ---------------------------------------------------------------------------
// Auto-detect
// ---------------------------------------------------------------------------
async function autoDetectPlex(): Promise<{ url: string; token: string } | null> {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*:32400/*' })
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue
      const origin = new URL(tab.url).origin
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => localStorage.getItem('myPlexAccessToken'),
      })
      const token = results[0]?.result
      if (token) return { url: origin, token }
    }
  } catch {
    // Injection can fail for non-injectable tabs; treat as not found
  }
  return null
}

// ---------------------------------------------------------------------------
// Connect / Disconnect
// ---------------------------------------------------------------------------
async function handleConnect(): Promise<void> {
  setConnecting(true)
  hideConnectError()

  const detected = await autoDetectPlex()

  if (detected) {
    await connectWith(detected.url, detected.token)
    return
  }

  // Fall back to manual fields if visible
  const manualUrl = inputUrl?.value.trim()
  const manualToken = inputToken?.value.trim()

  if (manualUrl && manualToken) {
    await connectWith(manualUrl, manualToken)
    return
  }

  setConnecting(false)
  showConnectError('Plex not found. Open Plex in another tab and try again, or enter your server details manually.')
  manualEntry.hidden = false
  btnShowManual.hidden = true
}

async function connectWith(url: string, token: string): Promise<void> {
  setConnecting(true)
  hideConnectError()

  const client = new PlexClient(url, token)
  const reachable = await client.testConnection()

  if (!reachable) {
    setConnecting(false)
    await chrome.storage.local.remove([STORAGE_URL_KEY, STORAGE_TOKEN_KEY])
    showConnectError('Could not connect to Plex. Make sure Plex is running and try again.')
    return
  }

  await chrome.storage.local.set({
    [STORAGE_URL_KEY]: url,
    [STORAGE_TOKEN_KEY]: token,
  })

  try {
    discoveredSections = await client.getLibrarySections()
  } catch {
    discoveredSections = []
  }

  activeClient = client
  setConnecting(false)
  showExportSection(url)
}

function handleDisconnect(): void {
  activeClient = null
  discoveredSections = []
  chrome.storage.local.remove([STORAGE_URL_KEY, STORAGE_TOKEN_KEY])
  sectionExport.hidden = true
  sectionConnect.hidden = false
  manualEntry.hidden = true
  btnShowManual.hidden = false
  hideExportMessages()
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
async function handleExport(): Promise<void> {
  if (!activeClient) return

  const library = (document.querySelector('input[name="library"]:checked') as HTMLInputElement)
    .value as 'movies' | 'shows' | 'both'
  const format = (document.getElementById('select-format') as HTMLSelectElement).value

  setExporting(true)
  hideExportMessages()

  try {
    const movieSectionIds = discoveredSections
      .filter((s) => s.type === 'movie')
      .map((s) => s.key)
    const showSectionIds = discoveredSections
      .filter((s) => s.type === 'show')
      .map((s) => s.key)

    const sectionIds = {
      movieSectionIds: library === 'shows' ? [] : movieSectionIds,
      showSectionIds: library === 'movies' ? [] : showSectionIds,
    }

    const catalog = await activeClient.getCatalog(sectionIds)

    switch (format) {
      case 'xlsx': exportXlsx(catalog); break
      case 'docx': await exportDocx(catalog); break
      case 'pdf':  exportPdf(catalog); break
      case 'rtf':  exportRtf(catalog); break
      case 'txt':  exportTxt(catalog); break
      case 'xml':  exportXml(catalog); break
      default: throw new Error(`Unknown format: ${format}`)
    }

    showExportStatus('Export complete.')
  } catch (error) {
    if (error instanceof PlexConnectionError) {
      showExportError('Lost connection to Plex server.')
    } else if (error instanceof PlexApiError) {
      showExportError(`Plex API error: ${error.status} ${error.statusText}`)
    } else {
      showExportError('An unexpected error occurred.')
    }
  } finally {
    setExporting(false)
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function setConnecting(connecting: boolean): void {
  btnConnect.disabled = connecting
  btnConnect.textContent = connecting ? 'Connecting...' : 'Connect to Plex'
}

function setExporting(exporting: boolean): void {
  btnExport.disabled = exporting
  btnExport.textContent = exporting ? 'Exporting...' : 'Export'
}

function showExportSection(url: string): void {
  sectionConnect.hidden = true
  sectionExport.hidden = false
  labelServer.textContent = url.replace(/^https?:\/\//, '')
}

function showConnectError(msg: string): void {
  msgConnectError.textContent = msg
  msgConnectError.hidden = false
}

function hideConnectError(): void {
  msgConnectError.hidden = true
  msgConnectError.textContent = ''
}

function showExportStatus(msg: string): void {
  msgExportStatus.textContent = msg
  msgExportStatus.hidden = false
}

function showExportError(msg: string): void {
  msgExportError.textContent = msg
  msgExportError.hidden = false
}

function hideExportMessages(): void {
  msgExportStatus.hidden = true
  msgExportError.hidden = true
  msgExportStatus.textContent = ''
  msgExportError.textContent = ''
}
