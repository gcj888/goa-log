/**
 * send-email.mjs — Netlify Function
 *
 * Sends an entry as an email to all subscribers.
 * Called from Sanity Studio's "Send Email" document action.
 *
 * POST { entryId } with Authorization header matching SEND_EMAIL_SECRET.
 */

import { createClient } from '@sanity/client'
import { Resend } from 'resend'
import { marked } from 'marked'

// We inline the email renderer here since Netlify functions
// can't reliably import from ../../scripts/ at runtime.
// This duplicates email-renderer.js but keeps the function self-contained.

const SITE_URL = 'https://cabbages.info'

const sanityClient = createClient({
  projectId: 'vxhzzkqz',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
})

const resend = new Resend(process.env.RESEND_API_KEY)

const entryFields = `
  _id,
  date,
  title,
  tags,
  emailSentAt,
  blocks[] {
    _type,
    _key,
    text,
    url,
    size,
    "imageUrl": image.asset->url,
    "audioUrl": audio.asset->url
  },
  content,
  "imageUrl": image.asset->url,
  "audioUrl": audio.asset->url,
  embedUrl
`

// --- Email renderer (self-contained copy) ---

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function glowColorForEntry(entryId) {
  let hash = 0
  for (let i = 0; i < entryId.length; i++) {
    hash = ((hash << 5) - hash) + entryId.charCodeAt(i)
    hash = hash & hash
  }
  const hues = [10, 35, 200]
  const hue = hues[Math.abs(hash) % hues.length]
  return `hsla(${hue}, 70%, 45%, 0.6)`
}

function cleanEmbedInput(input) {
  if (!input) return ''
  const trimmed = input.trim()
  if (trimmed.includes('<')) {
    const match = trimmed.match(/src=["']([^"']+)["']/)
    return match ? match[1] : trimmed
  }
  return trimmed
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/)
  return match ? match[1] : null
}

function formatBandcampUrl(url) {
  try {
    const parsed = new URL(url)
    const artist = parsed.hostname.replace('.bandcamp.com', '')
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    const slug = pathParts[1]
    if (slug) return `${artist} \u2014 ${slug.replace(/-/g, ' ')}`
    return artist
  } catch { return url.replace(/https?:\/\//, '') }
}

function renderTextBlock(text) {
  if (!text) return ''
  const withLinks = text.replace(
    /^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\S+|youtu\.be\/\S+|soundcloud\.com\/\S+|[\w-]+\.bandcamp\.com\/\S+))$/gm,
    (match, url) => {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = extractYouTubeId(url)
        if (videoId) return `[![YouTube](https://img.youtube.com/vi/${videoId}/hqdefault.jpg)](${url})`
      }
      return `[${url}](${url})`
    }
  )
  return `<div style="line-height: 1.6; margin-bottom: 16px;">${marked(withLinks, { breaks: true })}</div>`
}

function renderEmbedBlock(url, glowColor) {
  const cleanUrl = cleanEmbedInput(url)
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    const videoId = extractYouTubeId(cleanUrl)
    if (videoId) {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
      const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      return `<div style="text-align: center; margin: 16px 0;">
        <a href="${watchUrl}" style="display: inline-block; text-decoration: none; box-shadow: 0 0 20px 4px ${glowColor};">
          <img src="${thumbUrl}" alt="YouTube video" style="display: block; max-width: 480px; width: 100%; height: auto;" />
        </a>
        <div style="margin-top: 8px;"><a href="${watchUrl}" style="color: #000000; font-size: 13px; font-family: 'IBM Plex Mono', 'Courier New', monospace;">&#9654; Watch on YouTube</a></div>
      </div>`
    }
  }
  if (cleanUrl.includes('soundcloud.com')) {
    return `<div style="text-align: center; margin: 16px 0;">
      <a href="${cleanUrl}" style="display: inline-block; padding: 12px 20px; border: 1px solid #000000; text-decoration: none; color: #000000; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 13px; box-shadow: 0 0 20px 4px ${glowColor};">&#9654; Listen on SoundCloud</a>
    </div>`
  }
  if (cleanUrl.includes('bandcamp.com')) {
    return `<div style="text-align: center; margin: 16px 0;">
      <a href="${cleanUrl}" style="display: inline-block; padding: 12px 20px; border: 1px solid #000000; text-decoration: none; color: #000000; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 13px; box-shadow: 0 0 20px 4px ${glowColor};">&#9654; ${escapeHtml(formatBandcampUrl(cleanUrl))}</a>
    </div>`
  }
  return `<div style="text-align: center; margin: 16px 0;"><a href="${cleanUrl}" style="color: #000000; font-size: 13px; text-decoration: underline;">${escapeHtml(cleanUrl)}</a></div>`
}

function renderImageBlock(imageUrl, size = 'full') {
  if (!imageUrl) return ''
  const mw = { small: '200px', medium: '400px', large: '600px', full: '100%' }[size] || '100%'
  return `<div style="text-align: center; margin: 16px 0;"><img src="${imageUrl}" alt="" style="max-width: ${mw}; height: auto; display: block; margin: 0 auto;" /></div>`
}

function renderAudioBlock(audioUrl) {
  if (!audioUrl) return ''
  return `<div style="text-align: center; margin: 16px 0;"><a href="${audioUrl}" style="display: inline-block; padding: 12px 20px; border: 1px solid #000000; text-decoration: none; color: #000000; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 13px;">&#9654; Listen / Download Audio</a></div>`
}

function generateEmailHtml(entry) {
  const glowColor = glowColorForEntry(entry._id)
  const d = new Date(entry.date)
  const formattedDate = `${d.getMonth() + 1}.${d.getDate()}.${String(d.getFullYear()).slice(-2)}`
  const isRelease = entry.tags?.includes('release')

  let blocksHtml = ''
  if (entry.blocks && entry.blocks.length > 0) {
    blocksHtml = entry.blocks.map(block => {
      switch (block._type) {
        case 'textBlock': return renderTextBlock(block.text)
        case 'embedBlock': return renderEmbedBlock(block.url, glowColor)
        case 'imageBlock': return renderImageBlock(block.imageUrl, block.size)
        case 'audioBlock': return renderAudioBlock(block.audioUrl)
        default: return ''
      }
    }).filter(Boolean).join('\n')
  } else {
    const parts = []
    if (entry.imageUrl) parts.push(renderImageBlock(entry.imageUrl, 'full'))
    if (entry.embedUrl) parts.push(renderEmbedBlock(entry.embedUrl, glowColor))
    if (entry.content) parts.push(renderTextBlock(entry.content))
    if (entry.audioUrl) parts.push(renderAudioBlock(entry.audioUrl))
    blocksHtml = parts.join('\n')
  }

  const tagsHtml = entry.tags?.length
    ? `<div style="margin-top: 8px;">${entry.tags.map(tag =>
        `<span style="display: inline-block; padding: 2px 6px; border: 1px solid #000000; font-size: 12px; margin-right: 6px; font-family: 'IBM Plex Mono', 'Courier New', monospace;">${escapeHtml(tag)}</span>`
      ).join('')}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 14px; line-height: 1.5;">
<div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
  <div style="margin-bottom: 24px; border-bottom: 1px solid #000000; padding-bottom: 16px;">
    <div style="font-size: 12px; opacity: 0.6; margin-bottom: 4px;">${formattedDate}</div>
    <div style="font-size: 15px; font-weight: 400;${isRelease ? ' background: #FFEB3B; display: inline-block; padding: 0 4px;' : ''}">${escapeHtml(entry.title)}</div>
    ${tagsHtml}
  </div>
  ${blocksHtml}
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #000000; font-size: 12px;">
    <a href="${SITE_URL}/#${entry._id}" style="color: #000000;">View on cabbages.info</a>
  </div>
</div>
</body></html>`
}

// --- Fetch subscribers from Sanity + Google Sheet ---

async function getAllSubscribers() {
  // Sanity subscribers
  const sanitySubscribers = await sanityClient.fetch(
    `*[_type == "subscriber" && status == "active"] { email }`
  )
  const emails = new Set(sanitySubscribers.map(s => s.email.toLowerCase().trim()))

  // Google Sheet (optional)
  const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL
  if (sheetUrl) {
    try {
      const res = await fetch(sheetUrl)
      const csv = await res.text()
      const lines = csv.split('\n').map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        const email = line.replace(/^"|"$/g, '').trim().toLowerCase()
        if (email && email.includes('@') && !email.includes(' ')) {
          emails.add(email)
        }
      }
    } catch (err) {
      console.error('Failed to fetch Google Sheet:', err)
    }
  }

  return [...emails]
}

// --- Main handler ---

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Auth check
  const authHeader = req.headers.get('authorization')
  const secret = process.env.SEND_EMAIL_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { entryId } = await req.json()
    if (!entryId) {
      return new Response(JSON.stringify({ error: 'Missing entryId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch entry
    const entry = await sanityClient.fetch(
      `*[_type == "logEntry" && _id == $id][0] {${entryFields}}`,
      { id: entryId }
    )

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if already sent
    if (entry.emailSentAt) {
      return new Response(JSON.stringify({
        error: `Already sent on ${new Date(entry.emailSentAt).toLocaleDateString()}`
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get subscribers
    const subscribers = await getAllSubscribers()
    if (subscribers.length === 0) {
      return new Response(JSON.stringify({ error: 'No subscribers found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Render email HTML
    const html = generateEmailHtml(entry)

    // Send via Resend (batch — up to 100 per call)
    const batchSize = 50
    let totalSent = 0

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      const { error } = await resend.batch.send(
        batch.map(email => ({
          from: 'cabbages.info <hello@cabbages.info>',
          to: email,
          subject: entry.title,
          html,
        }))
      )

      if (error) {
        console.error('Resend batch error:', error)
      } else {
        totalSent += batch.length
      }
    }

    // Mark as sent in Sanity
    await sanityClient
      .patch(entryId)
      .set({ emailSentAt: new Date().toISOString() })
      .commit()

    return new Response(JSON.stringify({
      message: `Email sent to ${totalSent} subscribers`,
      count: totalSent
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Send email error:', err)
    return new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
