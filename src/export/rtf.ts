import type { CatalogData } from '../plex/types'
import { movieToRow, showToRows, MOVIE_HEADER_LABELS, EPISODE_HEADER_LABELS, downloadFile } from '../utils/formatting'

/** Escape RTF special characters */
function esc(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
}

function bold(str: string): string {
  return `\\b ${esc(str)}\\b0`
}

function line(content = ''): string {
  return content + '\\par\n'
}

export function exportRtf(catalog: CatalogData): void {
  const parts: string[] = []

  // RTF header
  parts.push('{\\rtf1\\ansi\\deff0')
  parts.push('{\\fonttbl{\\f0 Helvetica;}}')
  parts.push('{\\colortbl;\\red229\\green160\\blue13;}') // Plex yellow = color 1
  parts.push('\\f0\\fs24\n')

  if (catalog.movies.length > 0) {
    parts.push(line(`{\\fs28\\cf1 ${bold('MOVIES')}}`))
    parts.push(line())

    const labels = MOVIE_HEADER_LABELS
    for (const movie of catalog.movies) {
      const row = movieToRow(movie)
      const titleLine = row.year ? `${esc(row.title)} (${row.year})` : esc(row.title)
      parts.push(line(`{\\fs26 ${bold(titleLine)}}`))
      const genres = [row.genre1, row.genre2, row.genre3].filter(Boolean)
      if (genres.length > 0)  parts.push(line(`  ${bold('Genres:')} ${esc(genres.join(', '))}`))
      if (row.director)       parts.push(line(`  ${bold(labels.director + ':')} ${esc(row.director)}`))
      if (row.secondDirector) parts.push(line(`  ${bold(labels.secondDirector + ':')} ${esc(row.secondDirector)}`))
      const actors = [row.actor1, row.actor2, row.actor3, row.actor4].filter(Boolean)
      if (actors.length > 0)  parts.push(line(`  ${bold('Cast:')} ${esc(actors.join(', '))}`))
      parts.push(line())
    }
  }

  if (catalog.shows.length > 0) {
    parts.push(line(`{\\fs28\\cf1 ${bold('TV SHOWS')}}`))
    parts.push(line())

    const labels = EPISODE_HEADER_LABELS
    for (const show of catalog.shows) {
      parts.push(line(`{\\fs26 ${bold(esc(show.title))}}`))
      const showGenres = show.genres.filter(Boolean)
      if (showGenres.length > 0) parts.push(line(`  ${bold('Genres:')} ${esc(showGenres.join(', '))}`))
      if (show.executiveProducers.length > 0) {
        parts.push(line(`  ${bold(labels.executiveProducer + ':')} ${esc(show.executiveProducers.join(', '))}`))
      }
      const actors = show.actors.filter(Boolean)
      if (actors.length > 0) parts.push(line(`  ${bold('Cast:')} ${esc(actors.join(', '))}`))
      parts.push(line())

      for (const row of showToRows(show)) {
        parts.push(line(`  ${bold(esc(row.episodeCode))} ${esc(row.episodeTitle)}`))
        if (row.director) parts.push(line(`    ${bold(labels.director + ':')} ${esc(row.director)}`))
      }
      parts.push(line())
    }
  }

  parts.push('}')
  downloadFile('plex-catalog.rtf', parts.join(''), 'application/rtf')
}
