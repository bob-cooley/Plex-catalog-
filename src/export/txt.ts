import type { CatalogData } from '../plex/types'
import {
  movieToRow, showToRows,
  MOVIE_HEADER_LABELS, EPISODE_HEADER_LABELS,
  downloadFile,
} from '../utils/formatting'

export function exportTxt(catalog: CatalogData): void {
  const lines: string[] = []

  if (catalog.movies.length > 0) {
    lines.push('MOVIES')
    lines.push('======')
    lines.push('')

    const labels = MOVIE_HEADER_LABELS
    for (const movie of catalog.movies) {
      const row = movieToRow(movie)
      lines.push(row.title + (row.year ? ` (${row.year})` : ''))
      const genres = [row.genre1, row.genre2, row.genre3].filter(Boolean)
      if (genres.length > 0)  lines.push(`  Genres: ${genres.join(', ')}`)
      if (row.director)       lines.push(`  ${labels.director}: ${row.director}`)
      if (row.secondDirector) lines.push(`  ${labels.secondDirector}: ${row.secondDirector}`)
      const actors = [row.actor1, row.actor2, row.actor3, row.actor4].filter(Boolean)
      if (actors.length > 0)  lines.push(`  Cast: ${actors.join(', ')}`)
      lines.push('')
    }
  }

  if (catalog.shows.length > 0) {
    lines.push('TV SHOWS')
    lines.push('========')
    lines.push('')

    const labels = EPISODE_HEADER_LABELS
    for (const show of catalog.shows) {
      const rows = showToRows(show)
      lines.push(show.title)
      const genres = show.genres.filter(Boolean)
      if (genres.length > 0) lines.push(`  Genres: ${genres.join(', ')}`)
      if (show.executiveProducers.length > 0) {
        lines.push(`  ${labels.executiveProducer}: ${show.executiveProducers.join(', ')}`)
      }
      const actors = show.actors.filter(Boolean)
      if (actors.length > 0) lines.push(`  Cast: ${actors.join(', ')}`)
      lines.push('')

      for (const row of rows) {
        lines.push(`  ${row.episodeCode} - ${row.episodeTitle}`)
        if (row.director) lines.push(`    ${labels.director}: ${row.director}`)
      }
      lines.push('')
    }
  }

  downloadFile('plex-catalog.txt', lines.join('\n'), 'text/plain')
}
