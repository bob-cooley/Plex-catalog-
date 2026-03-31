import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, HeadingLevel, BorderStyle, ShadingType,
} from 'docx'
import type { CatalogData } from '../plex/types'
import {
  movieToRow, showToRows,
  MOVIE_HEADERS, MOVIE_HEADER_LABELS,
  EPISODE_HEADERS, EPISODE_HEADER_LABELS,
  downloadFile,
} from '../utils/formatting'

const PLEX_YELLOW = 'E5A00D'
const HEADER_BG = '2E2E2E'

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: HEADER_BG },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: PLEX_YELLOW, size: 18 })],
    })],
  })
}

function dataCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, size: 18 })],
    })],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '444444' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '444444' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '444444' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '444444' },
    },
  })
}

function makeTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map(headerCell), tableHeader: true }),
      ...rows.map((row) => new TableRow({ children: row.map(dataCell) })),
    ],
  })
}

export async function exportDocx(catalog: CatalogData): Promise<void> {
  const sections: (Paragraph | Table)[] = []

  if (catalog.movies.length > 0) {
    sections.push(new Paragraph({
      text: 'Movies',
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'Movies', bold: true, color: PLEX_YELLOW, size: 32 })],
    }))
    sections.push(new Paragraph({ text: '' }))

    const headers = MOVIE_HEADERS.map((k) => MOVIE_HEADER_LABELS[k])
    const rows = catalog.movies.map((m) => {
      const row = movieToRow(m)
      return MOVIE_HEADERS.map((k) => row[k])
    })
    sections.push(makeTable(headers, rows))
    sections.push(new Paragraph({ text: '' }))
  }

  if (catalog.shows.length > 0) {
    sections.push(new Paragraph({
      children: [new TextRun({ text: 'TV Shows', bold: true, color: PLEX_YELLOW, size: 32 })],
    }))
    sections.push(new Paragraph({ text: '' }))

    const headers = EPISODE_HEADERS.map((k) => EPISODE_HEADER_LABELS[k])
    const rows = catalog.shows.flatMap((show) =>
      showToRows(show).map((row) => EPISODE_HEADERS.map((k) => row[k]))
    )
    sections.push(makeTable(headers, rows))
  }

  const doc = new Document({
    sections: [{ children: sections }],
  })

  const buf = await Packer.toBlob(doc)
  downloadFile('plex-catalog.docx', buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}
