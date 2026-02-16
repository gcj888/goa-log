/**
 * unsubscribe.mjs — Netlify Function
 *
 * Handles email unsubscribe requests.
 * GET ?token=<base64-encoded-email> → marks subscriber inactive, shows confirmation.
 */

import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: 'vxhzzkqz',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
})

function decodeToken(token) {
  try {
    return Buffer.from(token, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

function htmlPage(title, message) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — cabbages.info</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 32px 16px; background: #fff; color: #000; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 14px; line-height: 1.6; }
  .container { max-width: 480px; margin: 0 auto; }
  h1 { font-size: 18px; font-weight: 400; margin-bottom: 16px; }
  a { color: #000; }
</style>
</head>
<body>
<div class="container">
  <h1>${title}</h1>
  <p>${message}</p>
  <p style="margin-top: 32px; font-size: 12px;"><a href="https://cabbages.info">cabbages.info</a></p>
</div>
</body></html>`
}

export default async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new Response(htmlPage('Error', 'Missing unsubscribe token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const email = decodeToken(token)
  if (!email || !email.includes('@')) {
    return new Response(htmlPage('Error', 'Invalid unsubscribe token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    const subscriber = await sanityClient.fetch(
      `*[_type == "subscriber" && email == $email][0]`,
      { email: email.toLowerCase().trim() }
    )

    if (subscriber && subscriber.status === 'active') {
      await sanityClient
        .patch(subscriber._id)
        .set({ status: 'inactive', unsubscribedAt: new Date().toISOString() })
        .commit()
    }

    // Always show success (even if not found) to avoid email enumeration
    return new Response(
      htmlPage('Unsubscribed', "You've been unsubscribed from cabbages.info. You won't receive any more emails."),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err) {
    console.error('Unsubscribe error:', err)
    return new Response(
      htmlPage('Error', 'Something went wrong. Please try again or email graham@cabbages.info.'),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }
}
