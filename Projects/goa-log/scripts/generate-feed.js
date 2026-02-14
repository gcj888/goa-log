/**
 * generate-feed.js
 *
 * Build-time script that generates dist/feed.xml from Sanity entries
 * flagged with publishToEmail: true. Runs via `postbuild` npm hook.
 *
 * Each RSS item includes email-safe HTML in <content:encoded> that
 * Buttondown uses as the email body. Embeds are rendered as clickable
 * thumbnails/links since email clients don't support iframes.
 */

import { createClient } from '@sanity/client'
import { marked } from 'marked'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_PATH = path.join(__dirname, '../dist')
const SITE_URL = 'https://cabbages.info'

// --- Sanity client (mirrors sanity/client.js) ---

const sanityClient = createClient({
  projectId: 'vxhzzkqz',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})

const entryFields = `
  _id,
  date,
  title,
  tags,
  blocks[] {
    _type,
    _key,
    text,
    url,
    size,
    "imageUrl": image.asset->url,
    "audioUrl": audio.asset->url
  },
  // Legacy fields
  content,
  "imageUrl": image.asset->url,
  "audioUrl": audio.asset->url,
  embedUrl
`

async function fetchEmailEntries() {
  return await sanityClient.fetch(
    `*[_type == "logEntry" && publishToEmail == true] | order(date desc, _createdAt desc) [0...20] {${entryFields}}`
  )
}

// --- Helpers (ported from LogEntry.vue / PreviewPage.vue) ---

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
    if (slug) {
      const name = slug.replace(/-/g, ' ')
      return `${artist} \u2014 ${name}`
    }
    return artist
  } catch {
    return url.replace(/https?:\/\//, '')
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Deterministic glow color from entry ID.
 * Hashes the ID and picks from the same palette as the Vue components.
 */
function glowColorForEntry(entryId) {
  let hash = 0
  for (let i = 0; i < entryId.length; i++) {
    hash = ((hash << 5) - hash) + entryId.charCodeAt(i)
    hash = hash & hash
  }
  const hues = [10, 35, 200] // rust, gold, blue
  const hue = hues[Math.abs(hash) % hues.length]
  return `hsla(${hue}, 70%, 45%, 0.6)`
}

// --- Block renderers ---

function renderTextBlock(text) {
  if (!text) return ''
  // Convert inline embed URLs to links (instead of iframes for email)
  const withLinks = text.replace(
    /^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\S+|youtu\.be\/\S+|soundcloud\.com\/\S+|[\w-]+\.bandcamp\.com\/\S+))$/gm,
    (match, url) => {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = extractYouTubeId(url)
        if (videoId) {
          return `[![YouTube](https://img.youtube.com/vi/${videoId}/hqdefault.jpg)](${url})`
        }
      }
      return `[${url}](${url})`
    }
  )
  const html = marked(withLinks, { breaks: true })
  return `<div style="line-height: 1.6; margin-bottom: 16px;">${html}</div>`
}

function renderEmbedBlock(url, glowColor) {
  const cleanUrl = cleanEmbedInput(url)

  // YouTube: thumbnail with play overlay
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    const videoId = extractYouTubeId(cleanUrl)
    if (videoId) {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
      const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      return `
        <div style="text-align: center; margin: 16px 0;">
          <a href="${watchUrl}" style="display: inline-block; text-decoration: none; box-shadow: 0 0 20px 4px ${glowColor};">
            <img src="${thumbUrl}" alt="YouTube video" style="display: block; max-width: 480px; width: 100%; height: auto;" />
          </a>
          <div style="margin-top: 8px;">
            <a href="${watchUrl}" style="color: #000000; font-size: 13px; font-family: 'IBM Plex Mono', 'Courier New', monospace;">&#9654; Watch on YouTube</a>
          </div>
        </div>`
    }
  }

  // SoundCloud
  if (cleanUrl.includes('soundcloud.com')) {
    return `
      <div style="text-align: center; margin: 16px 0;">
        <a href="${cleanUrl}" style="
          display: inline-block; padding: 12px 20px;
          border: 1px solid #000000; text-decoration: none; color: #000000;
          font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 13px;
          box-shadow: 0 0 20px 4px ${glowColor};
        ">&#9654; Listen on SoundCloud</a>
      </div>`
  }

  // Bandcamp
  if (cleanUrl.includes('bandcamp.com')) {
    const label = formatBandcampUrl(cleanUrl)
    return `
      <div style="text-align: center; margin: 16px 0;">
        <a href="${cleanUrl}" style="
          display: inline-block; padding: 12px 20px;
          border: 1px solid #000000; text-decoration: none; color: #000000;
          font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 13px;
          box-shadow: 0 0 20px 4px ${glowColor};
        ">&#9654; ${escapeHtml(label)}</a>
      </div>`
  }

  // Generic link
  return `
    <div style="text-align: center; margin: 16px 0;">
      <a href="${cleanUrl}" style="color: #000000; font-size: 13px; font-family: 'IBM Plex Mono', 'Courier New', monospace; text-decoration: underline;">
        ${escapeHtml(cleanUrl)}
      </a>
    </div>`
}

function renderImageBlock(imageUrl, size = 'full') {
  if (!imageUrl) return ''
  const maxWidthMap = { small: '200px', medium: '400px', large: '600px', full: '100%' }
  const maxWidth = maxWidthMap[size] || '100%'
  return `
    <div style="text-align: center; margin: 16px 0;">
      <img src="${imageUrl}" alt="" style="max-width: ${maxWidth}; height: auto; display: block; margin: 0 auto;" />
    </div>`
}

function renderAudioBlock(audioUrl) {
  if (!audioUrl) return ''
  return `
    <div style="text-align: center; margin: 16px 0;">
      <a href="${audioUrl}" style="
        display: inline-block; padding: 12px 20px;
        border: 1px solid #000000; text-decoration: none; color: #000000;
        font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 13px;
      ">&#9654; Listen / Download Audio</a>
    </div>`
}

// --- Email HTML template ---

function generateEmailHtml(entry) {
  const glowColor = glowColorForEntry(entry._id)

  // Format date like the site: M.D.YY
  const d = new Date(entry.date)
  const formattedDate = `${d.getMonth() + 1}.${d.getDate()}.${String(d.getFullYear()).slice(-2)}`

  const isRelease = entry.tags?.includes('release')

  // Render blocks (or legacy fields if no blocks)
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
    // Legacy fields (pre-blocks entries)
    const parts = []
    if (entry.imageUrl) parts.push(renderImageBlock(entry.imageUrl, 'full'))
    if (entry.embedUrl) parts.push(renderEmbedBlock(entry.embedUrl, glowColor))
    if (entry.content) parts.push(renderTextBlock(entry.content))
    if (entry.audioUrl) parts.push(renderAudioBlock(entry.audioUrl))
    blocksHtml = parts.join('\n')
  }

  // Tags
  const tagsHtml = entry.tags?.length
    ? `<div style="margin-top: 8px;">${entry.tags.map(tag =>
        `<span style="display: inline-block; padding: 2px 6px; border: 1px solid #000000; font-size: 12px; margin-right: 6px; font-family: 'IBM Plex Mono', 'Courier New', monospace;">${escapeHtml(tag)}</span>`
      ).join('')}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 14px; line-height: 1.5;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="margin-bottom: 24px; border-bottom: 1px solid #000000; padding-bottom: 16px;">
      <div style="font-size: 12px; opacity: 0.6; margin-bottom: 4px;">${formattedDate}</div>
      <div style="font-size: 15px; font-weight: 400;${isRelease ? ' background: #FFEB3B; display: inline-block; padding: 0 4px;' : ''}">${escapeHtml(entry.title)}</div>
      ${tagsHtml}
    </div>

    <!-- Content -->
    ${blocksHtml}

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #000000; font-size: 12px;">
      <a href="${SITE_URL}/#${entry._id}" style="color: #000000;">View on cabbages.info</a>
    </div>

  </div>
</body>
</html>`
}

// --- RSS feed generation ---

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateRssXml(entries) {
  const now = new Date().toUTCString()

  const items = entries.map(entry => {
    const emailHtml = generateEmailHtml(entry)
    const pubDate = new Date(entry.date).toUTCString()
    const link = `${SITE_URL}/#${entry._id}`

    return `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${entry._id}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(entry.title)}</description>
      <content:encoded><![CDATA[${emailHtml}]]></content:encoded>
    </item>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>cabbages.info</title>
    <link>${SITE_URL}</link>
    <description>Updates from cabbages.info</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`
}

// --- Main ---

async function main() {
  console.log('Generating RSS feed...')

  const entries = await fetchEmailEntries()
  console.log(`Found ${entries.length} email-flagged entries`)

  if (entries.length === 0) {
    console.log('No entries flagged for email. Writing empty feed.')
  }

  const xml = generateRssXml(entries)

  // Ensure dist/ exists
  if (!fs.existsSync(DIST_PATH)) {
    console.error('dist/ directory not found. Run vite build first.')
    process.exit(1)
  }

  const feedPath = path.join(DIST_PATH, 'feed.xml')
  fs.writeFileSync(feedPath, xml, 'utf-8')
  console.log(`RSS feed written to ${feedPath} (${entries.length} items)`)
}

main().catch(err => {
  console.error('Failed to generate RSS feed:', err)
  process.exit(1)
})
