// ---------------------------------------------------------------------------
// Raw Plex API response types
// These mirror what the Plex HTTP API actually returns as JSON.
// ---------------------------------------------------------------------------

export interface PlexResponse {
  MediaContainer: {
    size: number
    totalSize?: number
    offset?: number
    Metadata?: PlexMetadata[]
    Directory?: PlexDirectory[]
  }
}

/** A library section (Movies, TV Shows, etc.) returned by GET /library/sections */
export interface PlexDirectory {
  key: string
  title: string
  type: string
  agent: string
  scanner: string
  language: string
  uuid: string
}

/**
 * A single metadata item from Plex. Covers movies, shows, and episodes.
 * Not all fields are present for all types:
 *   - Movies: title, year, Director, Role
 *   - Shows: title, year, Role (main cast), Producer
 *   - Episodes: title, grandparentTitle, parentIndex, index, Director, Role (guest cast)
 */
export interface PlexMetadata {
  ratingKey: string
  key: string
  type: 'movie' | 'show' | 'season' | 'episode'
  title: string
  year?: number

  // Episode hierarchy
  grandparentTitle?: string // Show title (on episodes)
  grandparentRatingKey?: string
  parentTitle?: string // Season title (on episodes)
  parentIndex?: number // Season number (on episodes)
  index?: number // Episode number (on episodes)

  // Genres
  Genre?: PlexTag[]

  // People - arrays of tagged names
  Director?: PlexTag[]
  Role?: PlexTag[] // Actors: show-level = main cast, episode-level = guest cast
  Producer?: PlexTag[]
  Writer?: PlexTag[]
}

/**
 * A tagged person in the Plex metadata.
 * `tag` is always the person's name.
 * `role` varies by context:
 *   - On Role (actors): the character name (e.g. "Walter White")
 *   - On Producer: the producer credit (e.g. "Executive Producer")
 */
export interface PlexTag {
  id?: number
  filter?: string
  tag: string
  role?: string
  thumb?: string
}

// ---------------------------------------------------------------------------
// Application domain types
// These are what the rest of the app works with. The Plex client transforms
// raw API responses into these before returning them.
// ---------------------------------------------------------------------------

export interface LibrarySection {
  key: string
  title: string
  type: 'movie' | 'show'
}

export interface Movie {
  title: string
  year?: number
  genres: string[] // Up to 3
  directors: string[]
  actors: string[] // Top 4 billed
}

export interface TvShow {
  title: string
  year?: number
  genres: string[] // Up to 3
  executiveProducers: string[]
  actors: string[] // Top 4 billed (show-level main cast)
  episodes: Episode[]
}

export interface Episode {
  showTitle: string
  title: string
  seasonNumber: number
  episodeNumber: number
  directors: string[]
  actors: string[] // Falls back to show-level if episode-level is empty
}

export interface CatalogData {
  movies: Movie[]
  shows: TvShow[]
}
