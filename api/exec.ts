import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL
  if (!appsScriptUrl) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured' })
  }

  const qs = new URLSearchParams(req.query as Record<string, string>).toString()

  try {
    const url = `${appsScriptUrl}?${qs}`
    console.log('Fetching:', url)
    const upstream = await fetch(url, { redirect: 'follow' })
    console.log('Upstream status:', upstream.status, upstream.headers.get('content-type'))
    if (!upstream.ok) {
      const body = await upstream.text()
      console.error('Upstream error body:', body.slice(0, 500))
      return res.status(upstream.status).json({ error: `Upstream error: ${upstream.status}` })
    }
    const text = await upstream.text()
    console.log('Response preview:', text.slice(0, 200))
    const data = JSON.parse(text)
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5')
    }
    return res.status(200).json(data)
  } catch (err) {
    console.error('Proxy error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: `Proxy fetch failed: ${message}` })
  }
}
