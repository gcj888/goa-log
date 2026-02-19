<template>
  <div class="preview-page">
    <header class="preview-header">
      <a href="#" class="back-link">&larr; back to feed</a>
    </header>

    <div v-if="loading" class="loading">loading...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="entry" class="preview-entry">
      <div class="entry-meta">
        <span class="entry-date">{{ formattedDate }}</span>
        <h2 class="entry-title" :class="{ 'is-release': isRelease }">{{ entry.title }}</h2>
        <div v-if="entry.tags?.length" class="entry-tags">
          <span v-for="tag in entry.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>

      <div class="entry-content">
        <!-- New block-based content -->
        <template v-if="entry.blocks && entry.blocks.length">
          <template v-for="block in entry.blocks" :key="block._key">
            <div v-if="block._type === 'textBlock' && block.text" class="entry-text" :style="{ '--glow-color': glowColor }" v-html="parseMarkdown(block.text)"></div>

            <div
              v-if="block._type === 'embedBlock' && block.url"
              class="entry-embed"
              :style="{ '--glow-color': glowColor }"
              v-html="getEmbedHtml(block.url)"
            ></div>

            <img
              v-if="block._type === 'imageBlock' && block.imageUrl"
              :src="block.imageUrl"
              alt=""
              class="entry-image"
              :class="`size-${block.size || 'full'}`"
            />

            <audio
              v-if="block._type === 'audioBlock' && block.audioUrl"
              :src="block.audioUrl"
              controls
              class="entry-audio"
            ></audio>
          </template>
        </template>

        <!-- Legacy fields fallback -->
        <template v-else>
          <img v-if="entry.imageUrl" :src="entry.imageUrl" alt="" class="entry-image" />
          <audio v-if="entry.audioUrl" :src="entry.audioUrl" controls class="entry-audio"></audio>
          <div v-if="entry.embedUrl" class="entry-embed" :style="{ '--glow-color': glowColor }" v-html="getEmbedHtml(entry.embedUrl)"></div>
          <div v-if="entry.content" class="entry-text" :style="{ '--glow-color': glowColor }" v-html="parsedLegacyContent"></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import { getLatestEntry } from '../../sanity/client'

// Fix links missing protocol — e.g. href="youtube.com" → href="https://youtube.com"
const fixBareLinks = (html) => {
  return html.replace(/href="(?!https?:\/\/|\/|#|mailto:)([^"]+)"/g, 'href="https://$1"')
}

const entry = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    entry.value = await getLatestEntry()
    if (!entry.value) {
      error.value = 'No entries found'
    }
  } catch (err) {
    error.value = 'Failed to load entry'
    console.error(err)
  } finally {
    loading.value = false
  }
})

const formattedDate = computed(() => {
  if (!entry.value?.date) return ''
  const date = new Date(entry.value.date)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = String(date.getFullYear()).slice(-2)
  return `${month}.${day}.${year}`
})

const isRelease = computed(() => {
  return entry.value?.tags?.includes('release')
})

// Generate a random glow color from a curated palette
const glowColor = computed(() => {
  const hues = [10, 35, 200] // rust, yellow/gold, blue
  const hue = hues[Math.floor(Math.random() * hues.length)]
  const saturation = 70
  const lightness = 30 + Math.floor(Math.random() * 25)
  return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`
})

// Extract a clean URL from embed code (e.g. iframe HTML) or return as-is if already a URL
const cleanEmbedInput = (input) => {
  if (!input) return ''
  const trimmed = input.trim()
  if (trimmed.includes('<')) {
    const match = trimmed.match(/src=["']([^"']+)["']/)
    return match ? match[1] : trimmed
  }
  return trimmed
}

// Format a Bandcamp URL into a readable label like "Artist — Album"
const formatBandcampUrl = (url) => {
  try {
    const parsed = new URL(url)
    const artist = parsed.hostname.replace('.bandcamp.com', '')
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    const slug = pathParts[1]
    if (slug) {
      const name = slug.replace(/-/g, ' ')
      return `${artist} — ${name}`
    }
    return artist
  } catch {
    return url.replace(/https?:\/\//, '')
  }
}

// Convert embed URLs on their own line to iframes
const convertEmbedUrls = (content) => {
  if (!content) return ''
  const embedPattern = /^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|soundcloud\.com\/|bandcamp\.com\/|.*\.bandcamp\.com\/)[^\s]+)$/gm
  return content.replace(embedPattern, (match, url) => {
    let embedUrl = url
    let height = '315'
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
      if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`
      return `<div class="inline-embed"><div class="youtube-wrapper"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div></div>`
    } else if (url.includes('soundcloud.com')) {
      embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`
      height = '166'
    } else if (url.includes('bandcamp.com/EmbeddedPlayer')) {
      return `<div class="inline-embed"><iframe src="${url}" style="border: 0; width: 350px; height: 470px;" frameborder="0" allowfullscreen></iframe></div>`
    } else if (url.includes('bandcamp.com')) {
      const label = formatBandcampUrl(url)
      return `<div class="inline-embed bandcamp-link"><a href="${url}" target="_blank" rel="noopener">▶ ${label}</a></div>`
    }

    return `<div class="inline-embed"><iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" allowfullscreen></iframe></div>`
  })
}

// Wrap any bare iframes (not already inside .inline-embed) in a centered wrapper
const wrapBareIframes = (html) => {
  return html.replace(/(<div class="inline-embed">)?(<iframe\b[^>]*>[\s\S]*?<\/iframe>)/gi, (match, wrapper, iframe) => {
    if (wrapper) return match
    return `<div class="inline-embed">${iframe}</div>`
  })
}

const preprocessMarkdown = (text) => {
  const fixedHeadings = text.replace(/^(#{1,6})([^#\s])/gm, '$1 $2')
  return fixedHeadings
    .split(/\n{2,}/)
    .map(block => {
      const trimmed = block.trim()
      if (/^#{1,6} /.test(trimmed)) return block
      if (/^>/.test(trimmed)) return block
      if (/^[-*+] |^\d+\. /.test(trimmed)) return block
      if (/^-{3,}$|^={3,}$/m.test(trimmed)) return block
      if (/^```/.test(trimmed)) return block
      return block.replace(/([^\n])\n([^\n])/g, '$1<br>\n$2')
    })
    .join('\n\n')
}

const parseMarkdown = (text) => {
  if (!text) return ''
  const withEmbeds = convertEmbedUrls(preprocessMarkdown(text))
  const html = marked(withEmbeds)
  return fixBareLinks(wrapBareIframes(html))
}

const parsedLegacyContent = computed(() => {
  if (!entry.value?.content) return ''
  const withEmbeds = convertEmbedUrls(preprocessMarkdown(entry.value.content))
  const html = marked(withEmbeds)
  return fixBareLinks(wrapBareIframes(html))
})

const getEmbedHtml = (input) => {
  if (!input) return ''

  let url = cleanEmbedInput(input)
  let width = '100%'
  let height = '315'

  if (url.includes('youtube.com/watch') || url.includes('youtu.be') || url.includes('youtube.com/embed')) {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/)?.[1]
    if (videoId) url = `https://www.youtube.com/embed/${videoId}`
    return `<div class="youtube-wrapper"><iframe src="${url}" frameborder="0" allowfullscreen></iframe></div>`
  }

  if (url.includes('soundcloud.com') && !url.includes('w.soundcloud.com/player')) {
    url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`
    height = '166'
  }

  // Bandcamp EmbeddedPlayer URL — render as iframe
  if (url.includes('bandcamp.com/EmbeddedPlayer')) {
    return `<iframe src="${url}" style="border: 0; width: 350px; height: 470px;" frameborder="0" allowfullscreen></iframe>`
  }

  // Bandcamp album/track page URL — show as styled link
  if (url.includes('bandcamp.com')) {
    const label = formatBandcampUrl(url)
    return `<div class="bandcamp-link"><a href="${url}" target="_blank" rel="noopener">▶ ${label}</a></div>`
  }

  return `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`
}
</script>

<style scoped>
.preview-page {
  max-width: 800px;
  margin: 0 auto;
  padding: calc(var(--spacing-unit) * 4);
}

.preview-header {
  margin-bottom: calc(var(--spacing-unit) * 4);
  border-bottom: 1px solid var(--border);
  padding-bottom: calc(var(--spacing-unit) * 2);
}

.back-link {
  font-size: 13px;
  color: inherit;
}

.entry-meta {
  margin-bottom: calc(var(--spacing-unit) * 4);
}

.entry-date {
  font-size: 13px;
  opacity: 0.6;
}

.entry-title {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 15px;
  font-weight: 400;
  margin: calc(var(--spacing-unit)) 0;
}

.entry-title.is-release {
  background: var(--highlight-bg);
  padding: 0 4px;
  margin-left: -4px;
  display: inline-block;
}

.entry-tags {
  display: flex;
  gap: calc(var(--spacing-unit));
  flex-wrap: wrap;
  margin-top: calc(var(--spacing-unit));
}

.tag {
  padding: 2px 6px;
  border: 1px solid var(--border);
  font-size: 13px;
}

.entry-content {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-unit) * 2);
}

.entry-image {
  max-width: 100%;
  height: auto;
  align-self: center;
}

.entry-image.size-small { max-width: 25%; }
.entry-image.size-medium { max-width: 50%; }
.entry-image.size-large { max-width: 75%; }
.entry-image.size-full { max-width: 100%; }

.entry-audio {
  width: 100%;
  max-width: 500px;
  align-self: center;
}

.entry-embed {
  padding: 16px 0;
  display: flex;
  justify-content: center;
}

.entry-embed :deep(iframe) {
  border: none;
  max-width: 100%;
  box-shadow: 0 0 20px 4px var(--glow-color);
}

.entry-embed :deep(.youtube-wrapper) {
  position: relative;
  width: 100%;
  max-width: 640px;
  aspect-ratio: 16 / 9;
}

.entry-embed :deep(.youtube-wrapper iframe) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.entry-embed :deep(.bandcamp-link) {
  padding: 12px 16px;
  border: 1px solid var(--border);
  display: inline-block;
}

.entry-embed :deep(.bandcamp-link a) {
  text-decoration: none;
  font-size: 14px;
}

.entry-text {
  line-height: 1.6;
}

.entry-text :deep(p) { margin: 0 0 1em 0; }
.entry-text :deep(p:last-child) { margin-bottom: 0; }
.entry-text :deep(a) { color: inherit; text-decoration: underline; }
.entry-text :deep(ul),
.entry-text :deep(ol) { margin: 0 0 1em 0; padding-left: 1.5em; }
.entry-text :deep(strong) { font-weight: 700; }
.entry-text :deep(em) { font-style: italic; }
.entry-text :deep(blockquote) { margin: 0.75em 0 0.75em 1.5em; padding-left: 1em; border-left: 2px solid currentColor; opacity: 0.7; }
.entry-text :deep(blockquote p) { margin: 0; }
.entry-text :deep(h1), .entry-text :deep(h2), .entry-text :deep(h3), .entry-text :deep(h4) { margin: 1em 0 0.25em 0; font-family: 'p22-morris-troy', sans-serif; font-weight: 700; }
.entry-text :deep(h1) { font-size: 30px; }
.entry-text :deep(h2) { font-size: 22px; }
.entry-text :deep(h3) { font-size: 17px; }
.entry-text :deep(h4) { font-size: 15px; }
.entry-text :deep(.inline-embed) { margin: 1em 0; display: flex; justify-content: center; }
.entry-text :deep(.inline-embed iframe) { border: none; max-width: 100%; box-shadow: 0 0 20px 4px var(--glow-color); }
.entry-text :deep(.youtube-wrapper) { position: relative; width: 100%; max-width: 640px; aspect-ratio: 16 / 9; }
.entry-text :deep(.youtube-wrapper iframe) { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.entry-text :deep(.bandcamp-link) { padding: 12px 16px; border: 1px solid var(--border); display: inline-block; }
.entry-text :deep(.bandcamp-link a) { text-decoration: none; font-size: 14px; }

.loading, .error {
  padding: calc(var(--spacing-unit) * 4);
  text-align: center;
}

.error { color: #ff0000; }
</style>
