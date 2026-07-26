import { useParams } from 'react-router-dom'

/**
 * A tournament is reachable two ways:
 *   /                  — the default tournament (DEFAULT_TOURNAMENT_SLUG, or
 *                        the only one that exists). Keeps existing links and
 *                        bookmarks working.
 *   /t/<slug>          — a specific tournament, once there is more than one.
 *
 * Everything below either route hangs off the same base, so pages build
 * links with `base` rather than hard-coding '/'.
 */
export function useTournamentRoute(): { slug?: string; base: string } {
  const { slug } = useParams<{ slug?: string }>()
  return { slug, base: slug ? `/t/${slug}` : '' }
}

/** `base` is '' for the default tournament, so links need a '/' fallback. */
export function href(base: string, path = ''): string {
  return `${base}${path}` || '/'
}
