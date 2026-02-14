/**
 * email-renderer.js
 *
 * Shared email HTML renderer. Used by both:
 * - generate-feed.js (build-time RSS generation)
 * - netlify/functions/send-email.mjs (direct email sending via Resend)
 *
 * Produces email-safe HTML with inline CSS — no iframes, no CSS vars,
 * no external stylesheets. Embeds render as clickable thumbnails/links.
 */

import { marked } from 'marked'

const SITE_URL = 'https://cabbages.info'

// --- Helpers ---

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

export function escapeHtml(str) {
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
export function glowColorForEntry(entryId) {
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

// --- Main renderer ---

export function renderBlocks(entry, glowColor) {
  if (entry.blocks && entry.blocks.length > 0) {
    return entry.blocks.map(block => {
      switch (block._type) {
        case 'textBlock': return renderTextBlock(block.text)
        case 'embedBlock': return renderEmbedBlock(block.url, glowColor)
        case 'imageBlock': return renderImageBlock(block.imageUrl, block.size)
        case 'audioBlock': return renderAudioBlock(block.audioUrl)
        default: return ''
      }
    }).filter(Boolean).join('\n')
  }

  // Legacy fields (pre-blocks entries)
  const parts = []
  if (entry.imageUrl) parts.push(renderImageBlock(entry.imageUrl, 'full'))
  if (entry.embedUrl) parts.push(renderEmbedBlock(entry.embedUrl, glowColor))
  if (entry.content) parts.push(renderTextBlock(entry.content))
  if (entry.audioUrl) parts.push(renderAudioBlock(entry.audioUrl))
  return parts.join('\n')
}

export function generateEmailHtml(entry) {
  const glowColor = glowColorForEntry(entry._id)

  const d = new Date(entry.date)
  const formattedDate = `${d.getMonth() + 1}.${d.getDate()}.${String(d.getFullYear()).slice(-2)}`

  const isRelease = entry.tags?.includes('release')

  const blocksHtml = renderBlocks(entry, glowColor)

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
