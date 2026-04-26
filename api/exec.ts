import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL?.trim()
  if (!appsScriptUrl) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured' })
  }

  const qs = new URLSearchParams(req.query as Record<string, string>).toString()
  const url = `${appsScriptUrl}?${qs}`

  try {
    // Use manual redirect to see where Apps Script actually sends us
    const first = await fetch(url, { redirect: 'manual' })
    const location = first.headers.get('location')

    // If it redirects to accounts.google.com it's demanding auth
    if (location) {
      const isLoginRedirect = location.includes('accounts.google.com')
      if (isLoginRedirect) {
        return res.status(403).json({
          error: 'Apps Script requires authentication — deployment is not set to "Anyone (even anonymous)"',
          redirectsTo: location,
        })
      }
      // Follow the redirect manually
      const second = await fetch(location, { redirect: 'follow' })
      const text = await second.text()
      const data = JSON.parse(text)
      if (req.method === 'GET') {
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5')
      }
      return res.status(200).json(data)
    }

    // No redirect — read directly
    const text = await first.text()
    const data = JSON.parse(text)
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5')
    }
    return res.status(200).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return res.status(502).json({ error: message, url })
  }
}
