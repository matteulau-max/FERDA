import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL?.trim()
  if (!appsScriptUrl) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured' })
  }

  const qs = new URLSearchParams(req.query as Record<string, string>).toString()
  const url = `${appsScriptUrl}?${qs}`

  try {
    // Apps Script /exec issues a redirect. Using redirect:'manual' then
    // following the Location header ourselves avoids receiving an HTML page
    // that redirect:'follow' can land on in server-to-server contexts.
    const first = await fetch(url, { redirect: 'manual' })
    const location = first.headers.get('location') ?? url
    const second = await fetch(location, { redirect: 'follow' })
    const data = await second.json()
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5')
    }
    return res.status(200).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: message, url })
  }
}
