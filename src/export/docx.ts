import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, PageOrientation, convertMillimetersToTwip,
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

// A4 landscape: 297mm wide, 210mm tall. 20mm margins each side.
// Usable width = 257mm
const USABLE_W = convertMillimetersToTwip(257)

// Column widths in twips — movies (11 cols) and TV shows (12 cols)
// Values are proportional; they will be scaled to fill USABLE_W exactly.
const MOVIE_COL_WEIGHTS =    [50, 10, 15, 15, 15, 28, 28, 20, 20, 20, 20] // 241 units
const EPISODE_COL_WEIGHTS =  [38, 10, 44, 13, 13, 13, 24, 24, 18, 18, 18, 18] // 251 units

function scaleWeights(weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0)
  return weights.map((w) => Math.round((w / total) * USABLE_W))
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: HEADER_BG },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: PLEX_YELLOW, size: 16 })],
    })],
  })
}

function dataCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [new Paragraph({
      children: [new TextRun({ text, size: 16 })],
    })],
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left:   { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right:  { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  })
}

function makeTable(headers: string[], rows: string[][], colWidths: number[]): Table {
  return new Table({
    width: { size: USABLE_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => headerCell(h, colWidths[i])),
      }),
      ...rows.map((row) =>
        new TableRow({ children: row.map((v, i) => dataCell(v, colWidths[i])) })
      ),
    ],
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: PLEX_YELLOW, size: 32 })],
    spacing: { after: 200 },
  })
}

export async function exportDocx(catalog: CatalogData): Promise<void> {
  const children: (Paragraph | Table)[] = []

  if (catalog.movies.length > 0) {
    children.push(sectionHeading('Movies'))

    const colWidths = scaleWeights(MOVIE_COL_WEIGHTS)
    const headers = MOVIE_HEADERS.map((k) => MOVIE_HEADER_LABELS[k])
    const rows = catalog.movies.map((m) => {
      const row = movieToRow(m)
      return MOVIE_HEADERS.map((k) => row[k])
    })
    children.push(makeTable(headers, rows, colWidths))
    children.push(new Paragraph({ text: '' }))
  }

  if (catalog.shows.length > 0) {
    children.push(sectionHeading('TV Shows'))

    const colWidths = scaleWeights(EPISODE_COL_WEIGHTS)
    const headers = EPISODE_HEADERS.map((k) => EPISODE_HEADER_LABELS[k])
    const rows = catalog.shows.flatMap((show) =>
      showToRows(show).map((row) => EPISODE_HEADERS.map((k) => row[k]))
    )
    children.push(makeTable(headers, rows, colWidths))
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
            width:  convertMillimetersToTwip(297),
            height: convertMillimetersToTwip(210),
          },
          margin: {
            top:    convertMillimetersToTwip(20),
            bottom: convertMillimetersToTwip(20),
            left:   convertMillimetersToTwip(20),
            right:  convertMillimetersToTwip(20),
          },
        },
      },
      children,
    }],
  })

  const buf = await Packer.toBlob(doc)
  downloadFile('plex-catalog.docx', buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
}
