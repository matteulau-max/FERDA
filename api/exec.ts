import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL
  if (!appsScriptUrl) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured' })
  }

  const qs = new URLSearchParams(req.query as Record<string, string>).toString()

  try {
    const upstream = await fetch(`${appsScriptUrl}?${qs}`, { redirect: 'follow' })
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream error: ${upstream.status}` })
    }
    const data = await upstream.json()
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5')
    }
    return res.status(200).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(502).json({ error: `Proxy fetch failed: ${message}` })
  }
}
