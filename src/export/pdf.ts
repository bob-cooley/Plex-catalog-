import { jsPDF } from 'jspdf'
import type { CatalogData } from '../plex/types'
import {
  movieToRow, showToRows,
  MOVIE_HEADERS, MOVIE_HEADER_LABELS,
  EPISODE_HEADERS, EPISODE_HEADER_LABELS,
  downloadFile,
} from '../utils/formatting'

const PLEX_YELLOW: [number, number, number] = [229, 160, 13]
const DARK_BG: [number, number, number] = [31, 31, 31]
const LIGHT_ROW: [number, number, number] = [245, 245, 245]
const WHITE: [number, number, number] = [255, 255, 255]

const MARGIN = 14
const ROW_H = 7
const HEADER_H = 8

export function exportPdf(catalog: CatalogData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = MARGIN

  function checkNewPage(needed = ROW_H): void {
    if (y + needed > doc.internal.pageSize.getHeight() - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  function drawSectionTitle(title: string): void {
    checkNewPage(12)
    doc.setFillColor(...DARK_BG)
    doc.rect(MARGIN, y, pageW - MARGIN * 2, 10, 'F')
    doc.setTextColor(...PLEX_YELLOW)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(title, MARGIN + 3, y + 7)
    y += 12
  }

  function drawTableHeader(headers: string[], colWidths: number[]): void {
    checkNewPage(HEADER_H)
    doc.setFillColor(...PLEX_YELLOW)
    doc.rect(MARGIN, y, pageW - MARGIN * 2, HEADER_H, 'F')
    doc.setTextColor(...DARK_BG)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    let x = MARGIN + 2
    headers.forEach((h, i) => {
      doc.text(h, x, y + 5.5, { maxWidth: colWidths[i] - 2 })
      x += colWidths[i]
    })
    y += HEADER_H
  }

  function drawTableRow(values: string[], colWidths: number[], rowIndex: number): void {
    checkNewPage(ROW_H)
    doc.setFillColor(...(rowIndex % 2 === 0 ? WHITE : LIGHT_ROW))
    doc.rect(MARGIN, y, pageW - MARGIN * 2, ROW_H, 'F')
    doc.setTextColor(40, 40, 40)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    let x = MARGIN + 2
    values.forEach((v, i) => {
      doc.text(v ?? '', x, y + 5, { maxWidth: colWidths[i] - 2 })
      x += colWidths[i]
    })
    y += ROW_H
  }

  // Movies
  if (catalog.movies.length > 0) {
    drawSectionTitle('Movies')
    const usableW = pageW - MARGIN * 2
    // title, year, genre1-3, director, 2nd director, actor1-4
    const colWidths = [44, 12, 18, 18, 18, 26, 26, 20, 20, 20, 20].map(
      (w) => (w / 242) * usableW
    )
    const headers = MOVIE_HEADERS.map((k) => MOVIE_HEADER_LABELS[k])
    drawTableHeader(headers, colWidths)

    catalog.movies.forEach((movie, i) => {
      const row = movieToRow(movie)
      drawTableRow(MOVIE_HEADERS.map((k) => row[k]), colWidths, i)
    })
    y += 6
  }

  // TV Shows
  if (catalog.shows.length > 0) {
    drawSectionTitle('TV Shows')
    const usableW = pageW - MARGIN * 2
    // show, ep code, ep title, genre1-3, exec producer, director, actor1-4
    const colWidths = [36, 12, 38, 16, 16, 16, 26, 26, 20, 20, 20, 20].map(
      (w) => (w / 266) * usableW
    )
    const headers = EPISODE_HEADERS.map((k) => EPISODE_HEADER_LABELS[k])
    drawTableHeader(headers, colWidths)

    let rowIndex = 0
    for (const show of catalog.shows) {
      for (const row of showToRows(show)) {
        drawTableRow(EPISODE_HEADERS.map((k) => row[k]), colWidths, rowIndex++)
      }
    }
  }

  const blob = doc.output('blob')
  downloadFile('plex-catalog.pdf', blob, 'application/pdf')
}
