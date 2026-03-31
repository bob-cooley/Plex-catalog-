import type { Movie, TvShow, Episode } from '../plex/types'

// ---------------------------------------------------------------------------
// Episode number formatting
// ---------------------------------------------------------------------------

/** Format season and episode numbers as S01E09 */
export function formatEpisodeCode(season: number, episode: number): string {
  return `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// People formatting
// ---------------------------------------------------------------------------

/** Join an array of names into a readable string: "A, B, C" */
export function formatList(names: string[]): string {
  return names.join(', ')
}

/** Return the first name from a list, or a fallback string */
export function firstOrFallback(names: string[], fallback = ''): string {
  return names[0] ?? fallback
}

// ---------------------------------------------------------------------------
// Catalog row types
// These are flat representations used by every export format.
// ---------------------------------------------------------------------------

export interface MovieRow {
  title: string
  year: string
  director: string
  secondDirector: string
  actor1: string
  actor2: string
  actor3: string
  actor4: string
}

export interface EpisodeRow {
  showTitle: string
  episodeCode: string
  episodeTitle: string
  executiveProducer: string
  director: string
  actor1: string
  actor2: string
  actor3: string
  actor4: string
}

// ---------------------------------------------------------------------------
// Catalog flattening
// ---------------------------------------------------------------------------

/** Flatten a Movie into an export row */
export function movieToRow(movie: Movie): MovieRow {
  return {
    title: movie.title,
    year: movie.year ? String(movie.year) : '',
    director: movie.directors[0] ?? '',
    secondDirector: movie.directors[1] ?? '',
    actor1: movie.actors[0] ?? '',
    actor2: movie.actors[1] ?? '',
    actor3: movie.actors[2] ?? '',
    actor4: movie.actors[3] ?? '',
  }
}

/** Flatten all episodes of a TvShow into export rows */
export function showToRows(show: TvShow): EpisodeRow[] {
  return show.episodes.map((ep: Episode) => ({
    showTitle: show.title,
    episodeCode: formatEpisodeCode(ep.seasonNumber, ep.episodeNumber),
    episodeTitle: ep.title,
    executiveProducer: show.executiveProducers[0] ?? '',
    director: ep.directors[0] ?? '',
    actor1: show.actors[0] ?? '',
    actor2: show.actors[1] ?? '',
    actor3: show.actors[2] ?? '',
    actor4: show.actors[3] ?? '',
  }))
}

// Column headers used by tabular formats (XLSX, TXT table, etc.)
export const MOVIE_HEADERS: (keyof MovieRow)[] = [
  'title', 'year', 'director', 'secondDirector',
  'actor1', 'actor2', 'actor3', 'actor4',
]

export const MOVIE_HEADER_LABELS: Record<keyof MovieRow, string> = {
  title: 'Title',
  year: 'Year',
  director: 'Director',
  secondDirector: 'Second Director',
  actor1: 'Actor 1',
  actor2: 'Actor 2',
  actor3: 'Actor 3',
  actor4: 'Actor 4',
}

export const EPISODE_HEADERS: (keyof EpisodeRow)[] = [
  'showTitle', 'episodeCode', 'episodeTitle', 'executiveProducer',
  'director', 'actor1', 'actor2', 'actor3', 'actor4',
]

export const EPISODE_HEADER_LABELS: Record<keyof EpisodeRow, string> = {
  showTitle: 'Show',
  episodeCode: 'Episode',
  episodeTitle: 'Title',
  executiveProducer: 'Executive Producer',
  director: 'Director',
  actor1: 'Actor 1',
  actor2: 'Actor 2',
  actor3: 'Actor 3',
  actor4: 'Actor 4',
}

// ---------------------------------------------------------------------------
// File download helper (browser)
// ---------------------------------------------------------------------------

/** Trigger a file download in the browser */
export function downloadFile(filename: string, content: Blob | string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
