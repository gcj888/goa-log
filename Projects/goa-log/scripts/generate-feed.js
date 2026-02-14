/**
 * generate-feed.js
 *
 * Build-time script that generates dist/feed.xml from Sanity entries
 * flagged with publishToEmail: true. Runs via `postbuild` npm hook.
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateEmailHtml, escapeHtml } from './email-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_PATH = path.join(__dirname, '../dist')
const SITE_URL = 'https://cabbages.info'

// --- Sanity client ---

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
