import * as XLSX from 'xlsx'
import type { CatalogData } from '../plex/types'
import {
  movieToRow, showToRows,
  MOVIE_HEADERS, MOVIE_HEADER_LABELS,
  EPISODE_HEADERS, EPISODE_HEADER_LABELS,
  downloadFile,
} from '../utils/formatting'

export function exportXlsx(catalog: CatalogData): void {
  const wb = XLSX.utils.book_new()

  if (catalog.movies.length > 0) {
    const header = MOVIE_HEADERS.map((k) => MOVIE_HEADER_LABELS[k])
    const rows = catalog.movies.map((m) => {
      const row = movieToRow(m)
      return MOVIE_HEADERS.map((k) => row[k])
    })
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])

    // Bold header row
    const headerRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
      if (cell) cell.s = { font: { bold: true } }
    }

    // Column widths
    ws['!cols'] = [
      { wch: 40 }, // Title
      { wch: 6 },  // Year
      { wch: 25 }, // Director
      { wch: 25 }, // Second Director
      { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, // Actors
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Movies')
  }

  if (catalog.shows.length > 0) {
    const header = EPISODE_HEADERS.map((k) => EPISODE_HEADER_LABELS[k])
    const rows = catalog.shows.flatMap((show) => {
      return showToRows(show).map((row) => EPISODE_HEADERS.map((k) => row[k]))
    })
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])

    ws['!cols'] = [
      { wch: 35 }, // Show
      { wch: 8 },  // Episode code
      { wch: 40 }, // Title
      { wch: 25 }, // Executive Producer
      { wch: 25 }, // Director
      { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, // Actors
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'TV Shows')
  }

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  downloadFile('plex-catalog.xlsx', new Blob([buf], { type: 'application/octet-stream' }), 'application/octet-stream')
}
