import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL?.trim()
  if (!appsScriptUrl) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured' })
  }

  const qs = new URLSearchParams(req.query as Record<string, string>).toString()
  const url = `${appsScriptUrl}?${qs}`

  try {
    const upstream = await fetch(url, { redirect: 'follow' })
    const text = await upstream.text()
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `Upstream error: ${upstream.status}`,
        body: text.slice(0, 500),
      })
    }
    const data = JSON.parse(text)
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5')
    }
    return res.status(200).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    return res.status(502).json({ error: message, stack, url })
  }
}
