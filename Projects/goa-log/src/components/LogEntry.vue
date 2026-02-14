<template>
  <div class="log-entry" :class="{ expanded: isExpanded, highlighted: isHighlighted, reveal: isRevealing }">
    <!-- Hidden preload iframe -->
    <iframe
      v-if="preloadEmbed && !isExpanded"
      :src="preloadSrc"
      class="preload-iframe"
    ></iframe>

    <!-- Collapsed row view -->
    <div class="entry-row" :class="{ clickable: hasExpandableContent }" @click="hasExpandableContent && toggleExpand()" @mouseenter="startPreload">
      <div class="col-date" @click.stop="copyPermalink" :title="copied ? 'Copied!' : 'Click to copy link'">
        <span class="date-link">{{ formattedDate }}</span>
        <span v-if="copied" class="copied-tooltip">Copied!</span>
      </div>
      <div class="col-title" :class="{ 'is-release': isRelease, 'hide-highlight': mistActive && !isRevealing, 'fade-in-highlight': isRevealing }">
        {{ entry.title }}
      </div>
      <div class="col-tags">
        <span v-for="tag in entry.tags" :key="tag" class="tag">
          {{ tag }}
        </span>
      </div>
      <div class="col-expand">
        <button v-if="hasExpandableContent" class="expand-btn" @click.stop="toggleExpand">
          {{ isExpanded ? '−' : '+' }}
        </button>
      </div>
    </div>

    <!-- Expanded content -->
    <div v-if="isExpanded" class="entry-content">
      <!-- New block-based content -->
      <template v-if="entry.blocks && entry.blocks.length">
        <template v-for="block in entry.blocks" :key="block._key">
          <!-- Text block -->
          <div v-if="block._type === 'textBlock' && block.text" class="entry-text content-inner" :style="{ '--glow-color': glowColor }" v-html="parseMarkdown(block.text)"></div>

          <!-- Embed block -->
          <div
            v-if="block._type === 'embedBlock' && block.url"
            class="entry-embed"
            :style="{ '--glow-color': glowColor }"
            v-html="getEmbedHtml(block.url)"
          ></div>

          <!-- Image block -->
          <div v-if="block._type === 'imageBlock' && block.imageUrl" class="entry-media">
            <img
              :src="block.imageUrl"
              alt=""
              class="entry-image"
              :class="`size-${block.size || 'full'}`"
            />
          </div>

          <!-- Audio block -->
          <div v-if="block._type === 'audioBlock' && block.audioUrl" class="entry-media">
            <audio
              :src="block.audioUrl"
              controls
              class="entry-audio"
            ></audio>
          </div>
        </template>
      </template>

      <!-- Legacy fields fallback -->
      <template v-else>
        <div v-if="entry.imageUrl" class="entry-media">
          <img :src="entry.imageUrl" alt="" class="entry-image" />
        </div>

        <div v-if="entry.audioUrl" class="entry-media">
          <audio :src="entry.audioUrl" controls class="entry-audio"></audio>
        </div>

        <div
          v-if="entry.embedUrl"
          class="entry-embed"
          :style="{ '--glow-color': glowColor }"
          v-html="getEmbedHtml(entry.embedUrl)"
        ></div>

        <div v-if="entry.content" class="entry-text content-inner" :style="{ '--glow-color': glowColor }" v-html="parsedLegacyContent"></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'

// Fix links missing protocol — e.g. href="youtube.com" → href="https://youtube.com"
const fixBareLinks = (html) => {
  return html.replace(/href="(?!https?:\/\/|\/|#|mailto:)([^"]+)"/g, 'href="https://$1"')
}

const props = defineProps({
  entry: {
    type: Object,
    required: true
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  isRevealing: {
    type: Boolean,
    default: false
  },
  mistActive: {
    type: Boolean,
    default: false
  }
})

const isExpanded = ref(false)
const copied = ref(false)
const preloadEmbed = ref(false)

const formattedDate = computed(() => {
  const date = new Date(props.entry.date)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = String(date.getFullYear()).slice(-2)
  return `${month}.${day}.${year}`
})

const copyPermalink = () => {
  const url = `${window.location.origin}${window.location.pathname}#${props.entry._id}`
  navigator.clipboard.writeText(url).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = url
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  })
}

const isRelease = computed(() => {
  return props.entry.tags?.includes('release')
})

const hasExpandableContent = computed(() => {
  // Check for new block-based content
  if (props.entry.blocks && props.entry.blocks.length > 0) {
    return true
  }
  // Legacy fallback
  return props.entry.imageUrl || props.entry.embedUrl || props.entry.audioUrl || props.entry.content
})

// Generate a random glow color from a curated palette
const glowColor = computed(() => {
  const hues = [10, 35, 200] // rust, yellow/gold, blue
  const hue = hues[Math.floor(Math.random() * hues.length)]
  const saturation = 70
  const lightness = 30 + Math.floor(Math.random() * 25) // 30-55% for contrast
  return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.6)`
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// Extract a clean URL from embed code (e.g. iframe HTML) or return as-is if already a URL
const cleanEmbedInput = (input) => {
  if (!input) return ''
  const trimmed = input.trim()
  // If it contains HTML, extract the src attribute
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
    const type = pathParts[0] // "album" or "track"
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

  // Pattern for URLs on their own line (YouTube, SoundCloud, Bandcamp)
  const embedPattern = /^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|soundcloud\.com\/|bandcamp\.com\/|.*\.bandcamp\.com\/)[^\s]+)$/gm

  return content.replace(embedPattern, (match, url) => {
    let embedUrl = url
    let height = '315'

    // YouTube — responsive 16:9 wrapper
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`
      }
      return `<div class="inline-embed"><div class="youtube-wrapper"><iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div></div>`
    }
    // SoundCloud
    else if (url.includes('soundcloud.com')) {
      embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`
      height = '166'
    }
    // Bandcamp EmbeddedPlayer URL — render as iframe
    else if (url.includes('bandcamp.com/EmbeddedPlayer')) {
      return `<div class="inline-embed"><iframe src="${url}" style="border: 0; width: 350px; height: 470px;" frameborder="0" allowfullscreen></iframe></div>`
    }
    // Bandcamp album/track page URL — styled link
    else if (url.includes('bandcamp.com')) {
      const label = formatBandcampUrl(url)
      return `<div class="inline-embed bandcamp-link"><a href="${url}" target="_blank" rel="noopener">▶ ${label}</a></div>`
    }

    return `<div class="inline-embed"><iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" allowfullscreen></iframe></div>`
  })
}

// Wrap any bare iframes (not already inside .inline-embed) in a centered wrapper
const wrapBareIframes = (html) => {
  return html.replace(/(<div class="inline-embed">)?(<iframe\b[^>]*>[\s\S]*?<\/iframe>)/gi, (match, wrapper, iframe) => {
    if (wrapper) return match // already wrapped
    return `<div class="inline-embed">${iframe}</div>`
  })
}

// Parse markdown for text blocks
const parseMarkdown = (text) => {
  if (!text) return ''
  const withEmbeds = convertEmbedUrls(text)
  const html = marked(withEmbeds, { breaks: true })
  return fixBareLinks(wrapBareIframes(html))
}

// Legacy: Parse markdown content with inline embeds
const parsedLegacyContent = computed(() => {
  if (!props.entry.content) return ''
  const withEmbeds = convertEmbedUrls(props.entry.content)
  const html = marked(withEmbeds, { breaks: true })
  return fixBareLinks(wrapBareIframes(html))
})

// Preload embed on hover
const startPreload = () => {
  // Check blocks for embeds
  const hasEmbed = props.entry.blocks?.some(b => b._type === 'embedBlock' && b.url) || props.entry.embedUrl
  if (hasEmbed && !preloadEmbed.value) {
    preloadEmbed.value = true
  }
}

// Get the src URL for preloading
const preloadSrc = computed(() => {
  // Check blocks first
  const embedBlock = props.entry.blocks?.find(b => b._type === 'embedBlock' && b.url)
  const embedInput = embedBlock?.url || props.entry.embedUrl
  if (!embedInput) return ''
  let url = cleanEmbedInput(embedInput)

  if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
    if (videoId) url = `https://www.youtube.com/embed/${videoId}`
  }
  if (url.includes('soundcloud.com') && !url.includes('w.soundcloud.com/player')) {
    url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`
  }
  return url
})

// Convert a URL to embed HTML
const getEmbedHtml = (input) => {
  if (!input) return ''

  let url = cleanEmbedInput(input)
  let width = '100%'
  let height = '315'

  // YouTube — responsive 16:9 wrapper
  if (url.includes('youtube.com/watch') || url.includes('youtu.be') || url.includes('youtube.com/embed')) {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/)?.[1]
    if (videoId) {
      url = `https://www.youtube.com/embed/${videoId}`
    }
    return `<div class="youtube-wrapper"><iframe src="${url}" frameborder="0" allowfullscreen></iframe></div>`
  }

  // SoundCloud
  if (url.includes('soundcloud.com') && !url.includes('w.soundcloud.com/player')) {
    url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`
    height = '166'
  }

  // Bandcamp EmbeddedPlayer URL — render as iframe
  if (url.includes('bandcamp.com/EmbeddedPlayer')) {
    return `<iframe src="${url}" style="border: 0; width: 350px; height: 470px;" frameborder="0" allowfullscreen></iframe>`
  }

  // Bandcamp album/track page URL — show as styled link (can't embed without the player URL)
  if (url.includes('bandcamp.com')) {
    const label = formatBandcampUrl(url)
    return `<div class="bandcamp-link"><a href="${url}" target="_blank" rel="noopener">▶ ${label}</a></div>`
  }

  return `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`
}
</script>

<style scoped>
.log-entry {
  position: relative;
}

.preload-iframe {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.log-entry.highlighted {
  z-index: 10;
}

.log-entry.highlighted .col-date,
.log-entry.highlighted .col-tags,
.log-entry.highlighted .col-expand {
  opacity: 0;
  transition: opacity 30s ease-out;
}

.log-entry.highlighted.reveal .col-date,
.log-entry.highlighted.reveal .col-tags,
.log-entry.highlighted.reveal .col-expand {
  opacity: 1;
}

.entry-row {
  display: grid;
  grid-template-columns: 100px 1fr 240px 32px;
  gap: calc(var(--spacing-unit) * 2);
  padding: calc(var(--spacing-unit) * 2);
  transition: background-color 0.1s ease;
}

.entry-row.clickable {
  cursor: pointer;
}

.entry-row.clickable:hover {
  background: rgba(0, 0, 0, 0.04);
}

.col-date,
.col-title,
.col-tags,
.col-expand {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-date {
  position: relative;
  cursor: pointer;
  overflow: visible;
}

.date-link {
  transition: opacity 0.1s ease;
}

.col-date:hover .date-link {
  opacity: 0.6;
}

.copied-tooltip {
  position: absolute;
  top: 0;
  left: 100%;
  margin-left: 8px;
  background: var(--text);
  color: var(--bg);
  padding: 2px 6px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10;
}

.col-title.is-release {
  background: var(--highlight-bg);
  padding: 0 4px;
  margin: 0 -4px;
  transition: background 0.15s, color 0.15s;
}

.entry-row:hover .col-title.is-release {
  background: var(--text);
  color: var(--bg);
}

.col-title.is-release.hide-highlight {
  background: transparent;
}

.col-title.is-release.fade-in-highlight {
  background: var(--highlight-bg);
  transition: background 30s ease-out;
}

.col-tags {
  display: flex;
  gap: calc(var(--spacing-unit));
  flex-wrap: wrap;
}

.tag {
  padding: 2px 6px;
  border: 1px solid var(--border);
  font-size: 13px;
  white-space: nowrap;
}

.expand-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  font-size: 18px;
  font-weight: 400;
  opacity: 0.6;
  transition: opacity 0.1s ease;
}

.expand-btn:focus {
  outline: none;
  opacity: 1;
}

.expand-btn:hover {
  opacity: 1;
}

.entry-content {
  animation: slideDown 0.2s ease-out;
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-unit) * 2);
  padding: calc(var(--spacing-unit) * 3) 0;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 2000px;
  }
}

.content-inner {
  padding-left: calc(100px + var(--spacing-unit) * 4); /* Align with title column */
  padding-right: calc(240px + var(--spacing-unit) * 4); /* Match right side to tags column */
}

.entry-image {
  max-width: 100%;
  height: auto;
  align-self: center;
}

.entry-image.size-small {
  max-width: 25%;
}

.entry-image.size-medium {
  max-width: 50%;
}

.entry-image.size-large {
  max-width: 75%;
}

.entry-image.size-full {
  max-width: 100%;
}

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

.entry-media {
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

.entry-text :deep(p) {
  margin: 0 0 1em 0;
}

.entry-text :deep(p:last-child) {
  margin-bottom: 0;
}

.entry-text :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.entry-text :deep(ul),
.entry-text :deep(ol) {
  margin: 0 0 1em 0;
  padding-left: 1.5em;
}

.entry-text :deep(strong) {
  font-weight: 700;
}

.entry-text :deep(em) {
  font-style: italic;
}

.entry-text :deep(.inline-embed) {
  margin: 1em 0;
  display: flex;
  justify-content: center;
}

.entry-text :deep(.inline-embed iframe) {
  border: none;
  max-width: 100%;
  box-shadow: 0 0 20px 4px var(--glow-color);
}

.entry-text :deep(.youtube-wrapper) {
  position: relative;
  width: 100%;
  max-width: 640px;
  aspect-ratio: 16 / 9;
}

.entry-text :deep(.youtube-wrapper iframe) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.entry-text :deep(.bandcamp-link) {
  padding: 12px 16px;
  border: 1px solid var(--border);
  display: inline-block;
}

.entry-text :deep(.bandcamp-link a) {
  text-decoration: none;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .entry-row {
    grid-template-columns: 80px 1fr 24px;
    gap: calc(var(--spacing-unit));
  }

  .col-tags {
    display: none;
  }

  .content-inner {
    padding-left: calc(80px + var(--spacing-unit) * 3); /* Align with title on mobile */
    padding-right: calc(24px + var(--spacing-unit) * 3); /* Match right side to expand column */
  }
}
</style>
