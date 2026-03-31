import { PlexClient, PlexApiError, PlexConnectionError } from '../plex/client'
import type { LibrarySection } from '../plex/types'
import { exportXlsx } from '../export/xlsx'
import { exportDocx } from '../export/docx'
import { exportPdf } from '../export/pdf'
import { exportRtf } from '../export/rtf'
import { exportTxt } from '../export/txt'
import { exportXml } from '../export/xml'

// ---------------------------------------------------------------------------
// Storage keys — token stored in chrome.storage.local per project conventions
// ---------------------------------------------------------------------------
const STORAGE_URL_KEY = 'plexUrl'
const STORAGE_TOKEN_KEY = 'plexToken'
const DEFAULT_URL = 'http://localhost:32400'

// ---------------------------------------------------------------------------
// Element references
// ---------------------------------------------------------------------------
const inputUrl = document.getElementById('input-url') as HTMLInputElement
const inputToken = document.getElementById('input-token') as HTMLInputElement
const btnConnect = document.getElementById('btn-connect') as HTMLButtonElement
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
let discoveriedSections: LibrarySection[] = []

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedSettings()
  btnConnect.addEventListener('click', handleConnect)
  btnDisconnect.addEventListener('click', handleDisconnect)
  btnExport.addEventListener('click', handleExport)
})

async function loadSavedSettings(): Promise<void> {
  const stored = await chrome.storage.local.get([STORAGE_URL_KEY, STORAGE_TOKEN_KEY])
  inputUrl.value = (stored[STORAGE_URL_KEY] as string) || DEFAULT_URL
  if (stored[STORAGE_TOKEN_KEY]) {
    inputToken.value = stored[STORAGE_TOKEN_KEY] as string
  }
}

// ---------------------------------------------------------------------------
// Connect / Disconnect
// ---------------------------------------------------------------------------
async function handleConnect(): Promise<void> {
  const url = inputUrl.value.trim()
  const token = inputToken.value.trim()

  if (!url || !token) {
    showConnectError('Server URL and token are required.')
    return
  }

  setConnecting(true)
  hideConnectError()

  const client = new PlexClient(url, token)
  const reachable = await client.testConnection()

  if (!reachable) {
    setConnecting(false)
    showConnectError('Could not connect. Check the URL and token.')
    return
  }

  // Save to storage — token treated like a password, storage.local only
  await chrome.storage.local.set({
    [STORAGE_URL_KEY]: url,
    [STORAGE_TOKEN_KEY]: token,
  })

  // Discover library sections
  try {
    discoveriedSections = await client.getLibrarySections()
  } catch {
    // Non-fatal — export will handle missing sections gracefully
    discoveriedSections = []
  }

  activeClient = client
  setConnecting(false)
  showExportSection(url)
}

function handleDisconnect(): void {
  activeClient = null
  discoveriedSections = []
  sectionExport.hidden = true
  sectionConnect.hidden = false
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
    const movieSectionIds = discoveriedSections
      .filter((s) => s.type === 'movie')
      .map((s) => s.key)
    const showSectionIds = discoveriedSections
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
  btnConnect.textContent = connecting ? 'Connecting...' : 'Connect'
}

function setExporting(exporting: boolean): void {
  btnExport.disabled = exporting
  btnExport.textContent = exporting ? 'Exporting...' : 'Export'
}

function showExportSection(url: string): void {
  sectionConnect.hidden = true
  sectionExport.hidden = false
  // Strip protocol for display — token is never shown
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
