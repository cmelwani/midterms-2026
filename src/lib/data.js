export const POLL_INTERVAL_MS = 60_000
export const STALE_AFTER_MS = 2 * POLL_INTERVAL_MS + 10_000

export function dataUrl(file) {
  return `${import.meta.env.BASE_URL}data/${file}`
}

// Cache-busting + no-store so a refresh/poll always gets the latest deployed file
// (GitHub Pages sends max-age=600 on static assets).
export async function fetchJson(file, { signal } = {}) {
  const res = await fetch(`${dataUrl(file)}?t=${Date.now()}`, { cache: 'no-store', signal })
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return res.json()
}
