import type {
  PlexResponse,
  PlexMetadata,
  PlexTag,
  LibrarySection,
  Movie,
  TvShow,
  Episode,
  CatalogData,
} from './types'

/** Maximum number of billed actors to include per item. */
const MAX_ACTORS = 4
/** Maximum number of genres to include per item. */
const MAX_GENRES = 3

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class PlexApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
  ) {
    super(`Plex API error: ${status} ${statusText}`)
    this.name = 'PlexApiError'
  }
}

export class PlexConnectionError extends Error {
  public readonly originalError?: unknown

  constructor(baseUrl: string, cause?: unknown) {
    super(`Failed to connect to Plex server at ${baseUrl}`)
    this.name = 'PlexConnectionError'
    this.originalError = cause
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class PlexClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.token = token
  }

  // ---- Private helpers ---------------------------------------------------

  /**
   * All Plex HTTP calls funnel through here.
   * Requests JSON (Plex defaults to XML otherwise) and attaches the token.
   */
  private async request(path: string): Promise<PlexResponse> {
    const url = `${this.baseUrl}${path}`
    let response: Response

    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Plex-Token': this.token,
        },
      })
    } catch (error) {
      throw new PlexConnectionError(this.baseUrl, error)
    }

    if (!response.ok) {
      throw new PlexApiError(response.status, response.statusText)
    }

    return response.json()
  }

  // ---- Public API --------------------------------------------------------

  /** Quick check that the server is reachable and the token is valid. */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/')
      return true
    } catch {
      return false
    }
  }

  /** List library sections, filtered to movie and show types only. */
  async getLibrarySections(): Promise<LibrarySection[]> {
    const data = await this.request('/library/sections')
    const directories = data.MediaContainer.Directory ?? []

    return directories
      .filter((dir) => dir.type === 'movie' || dir.type === 'show')
      .map((dir) => ({
        key: dir.key,
        title: dir.title,
        type: dir.type as 'movie' | 'show',
      }))
  }

  /** Fetch all movies from a library section. */
  async getMovies(sectionId: string): Promise<Movie[]> {
    const data = await this.request(`/library/sections/${sectionId}/all?type=1`)
    const items = data.MediaContainer.Metadata ?? []

    return items.map((item) => ({
      title: item.title,
      year: item.year,
      genres: extractTags(item.Genre, MAX_GENRES),
      directors: extractTags(item.Director),
      actors: extractTags(item.Role, MAX_ACTORS),
    }))
  }

  /**
   * Fetch all TV shows from a library section, including their episodes.
   *
   * Two API calls per section:
   *   1. GET /library/sections/{id}/all?type=2 (shows, for main cast + exec producers)
   *   2. GET /library/sections/{id}/all?type=4 (episodes, for directors + season/ep numbers)
   *
   * Episodes are matched to shows by grandparentTitle and sorted by season/episode.
   */
  async getShows(sectionId: string): Promise<TvShow[]> {
    const [showData, episodeData] = await Promise.all([
      this.request(`/library/sections/${sectionId}/all?type=2`),
      this.request(`/library/sections/${sectionId}/all?type=4`),
    ])

    const shows = showData.MediaContainer.Metadata ?? []
    const allEpisodes = episodeData.MediaContainer.Metadata ?? []

    return shows.map((show) => {
      const showActors = extractTags(show.Role, MAX_ACTORS)

      const episodes: Episode[] = allEpisodes
        .filter((ep) => ep.grandparentTitle === show.title)
        .map((ep) => ({
          showTitle: show.title,
          title: ep.title,
          seasonNumber: ep.parentIndex ?? 0,
          episodeNumber: ep.index ?? 0,
          directors: extractTags(ep.Director),
          // Use episode-level actors if available, fall back to show-level main cast
          actors: extractTags(ep.Role, MAX_ACTORS).length > 0
            ? extractTags(ep.Role, MAX_ACTORS)
            : showActors,
        }))
        .sort((a, b) =>
          a.seasonNumber !== b.seasonNumber
            ? a.seasonNumber - b.seasonNumber
            : a.episodeNumber - b.episodeNumber
        )

      return {
        title: show.title,
        year: show.year,
        genres: extractTags(show.Genre, MAX_GENRES),
        executiveProducers: extractExecutiveProducers(show.Producer),
        actors: showActors,
        episodes,
      }
    })
  }

  /**
   * Fetch detailed metadata for a single item by its ratingKey.
   * Useful for supplementing data that the /all endpoint doesn't include.
   */
  async getMetadata(ratingKey: string): Promise<PlexMetadata | null> {
    const data = await this.request(`/library/metadata/${ratingKey}`)
    return data.MediaContainer.Metadata?.[0] ?? null
  }

  /**
   * High-level method: fetch a complete catalog across multiple library sections.
   * Runs all section fetches in parallel.
   */
  async getCatalog(sectionIds: {
    movieSectionIds: string[]
    showSectionIds: string[]
  }): Promise<CatalogData> {
    const [movieResults, showResults] = await Promise.all([
      Promise.all(sectionIds.movieSectionIds.map((id) => this.getMovies(id))),
      Promise.all(sectionIds.showSectionIds.map((id) => this.getShows(id))),
    ])

    return {
      movies: movieResults.flat(),
      shows: showResults.flat(),
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract name strings from a PlexTag array, optionally capped at `limit`. */
function extractTags(tags: PlexTag[] | undefined, limit?: number): string[] {
  if (!tags) return []
  const names = tags.map((t) => t.tag)
  return limit ? names.slice(0, limit) : names
}

/**
 * Filter producers to only those credited as Executive Producer.
 * Plex stores the credit type in the `role` field of Producer tags.
 */
function extractExecutiveProducers(producers: PlexTag[] | undefined): string[] {
  if (!producers) return []
  return producers
    .filter((p) => p.role?.toLowerCase().includes('executive producer'))
    .map((p) => p.tag)
}
