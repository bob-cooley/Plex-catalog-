import type { CatalogData } from '../plex/types'
import { movieToRow, showToRows, downloadFile } from '../utils/formatting'

/** Escape special XML characters */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function tag(name: string, value: string, indent = ''): string {
  return `${indent}<${name}>${esc(value)}</${name}>`
}

export function exportXml(catalog: CatalogData): void {
  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<catalog>')

  if (catalog.movies.length > 0) {
    lines.push('  <movies>')
    for (const movie of catalog.movies) {
      const row = movieToRow(movie)
      lines.push('    <movie>')
      lines.push(tag('title', row.title, '      '))
      if (row.year)            lines.push(tag('year', row.year, '      '))
      const genres = [row.genre1, row.genre2, row.genre3].filter(Boolean)
      if (genres.length > 0) {
        lines.push('      <genres>')
        for (const g of genres) lines.push(tag('genre', g, '        '))
        lines.push('      </genres>')
      }
      if (row.director)        lines.push(tag('director', row.director, '      '))
      if (row.secondDirector)  lines.push(tag('secondDirector', row.secondDirector, '      '))
      const actors = [row.actor1, row.actor2, row.actor3, row.actor4].filter(Boolean)
      if (actors.length > 0) {
        lines.push('      <cast>')
        for (const actor of actors) lines.push(tag('actor', actor, '        '))
        lines.push('      </cast>')
      }
      lines.push('    </movie>')
    }
    lines.push('  </movies>')
  }

  if (catalog.shows.length > 0) {
    lines.push('  <shows>')
    for (const show of catalog.shows) {
      lines.push('    <show>')
      lines.push(tag('title', show.title, '      '))
      if (show.year) lines.push(tag('year', String(show.year), '      '))
      const showGenres = show.genres.filter(Boolean)
      if (showGenres.length > 0) {
        lines.push('      <genres>')
        for (const g of showGenres) lines.push(tag('genre', g, '        '))
        lines.push('      </genres>')
      }
      if (show.executiveProducers.length > 0) {
        lines.push(tag('executiveProducer', show.executiveProducers[0], '      '))
      }
      const actors = show.actors.filter(Boolean)
      if (actors.length > 0) {
        lines.push('      <cast>')
        for (const actor of actors) lines.push(tag('actor', actor, '        '))
        lines.push('      </cast>')
      }
      lines.push('      <episodes>')
      for (const row of showToRows(show)) {
        lines.push('        <episode>')
        lines.push(tag('code', row.episodeCode, '          '))
        lines.push(tag('title', row.episodeTitle, '          '))
        if (row.director) lines.push(tag('director', row.director, '          '))
        lines.push('        </episode>')
      }
      lines.push('      </episodes>')
      lines.push('    </show>')
    }
    lines.push('  </shows>')
  }

  lines.push('</catalog>')
  downloadFile('plex-catalog.xml', lines.join('\n'), 'application/xml')
}
