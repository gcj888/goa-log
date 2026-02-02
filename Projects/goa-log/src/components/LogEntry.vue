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
      <div class="content-inner">
        <!-- New block-based content -->
        <template v-if="entry.blocks && entry.blocks.length">
          <template v-for="block in entry.blocks" :key="block._key">
            <!-- Text block -->
            <div v-if="block._type === 'textBlock' && block.text" class="entry-text" v-html="parseMarkdown(block.text)"></div>

            <!-- Embed block -->
            <div
              v-if="block._type === 'embedBlock' && block.url"
              class="entry-embed"
              :style="{ '--glow-color': glowColor }"
              v-html="getEmbedHtml(block.url)"
            ></div>

            <!-- Image block -->
            <img
              v-if="block._type === 'imageBlock' && block.imageUrl"
              :src="block.imageUrl"
              alt=""
              class="entry-image"
              :class="`size-${block.size || 'full'}`"
            />

            <!-- Audio block -->
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
          <img
            v-if="entry.imageUrl"
            :src="entry.imageUrl"
            alt=""
            class="entry-image"
          />

          <audio
            v-if="entry.audioUrl"
            :src="entry.audioUrl"
            controls
            class="entry-audio"
          ></audio>

          <div
            v-if="entry.embedUrl"
            class="entry-embed"
            :style="{ '--glow-color': glowColor }"
            v-html="getEmbedHtml(entry.embedUrl)"
          ></div>

          <div v-if="entry.content" class="entry-text" v-html="parsedLegacyContent"></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'

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

// Convert embed URLs on their own line to iframes
const convertEmbedUrls = (content) => {
  if (!content) return ''

  // Pattern for URLs on their own line (YouTube, SoundCloud, Bandcamp)
  const embedPattern = /^(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|soundcloud\.com\/|bandcamp\.com\/|.*\.bandcamp\.com\/)[^\s]+)$/gm

  return content.replace(embedPattern, (match, url) => {
    let embedUrl = url
    let height = '315'

    // YouTube
    if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`
      }
    }
    // SoundCloud
    else if (url.includes('soundcloud.com')) {
      embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`
      height = '166'
    }
    // Bandcamp - link with play icon (embeds require track IDs we don't have)
    else if (url.includes('bandcamp.com')) {
      return `<div class="inline-embed bandcamp-link"><a href="${url}" target="_blank" rel="noopener">▶ ${url.replace(/https?:\/\//, '')}</a></div>`
    }

    return `<div class="inline-embed"><iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" allowfullscreen></iframe></div>`
  })
}

// Parse markdown for text blocks
const parseMarkdown = (text) => {
  if (!text) return ''
  const withEmbeds = convertEmbedUrls(text)
  return marked(withEmbeds, { breaks: true })
}

// Legacy: Parse markdown content with inline embeds
const parsedLegacyContent = computed(() => {
  if (!props.entry.content) return ''
  const withEmbeds = convertEmbedUrls(props.entry.content)
  return marked(withEmbeds, { breaks: true })
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
  const input = embedInput.trim()

  // If it's HTML, extract src from iframe
  if (input.startsWith('<')) {
    const match = input.match(/src=["']([^"']+)["']/)
    return match ? match[1] : ''
  }

  // Convert URLs
  let url = input
  if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
    if (videoId) url = `https://www.youtube.com/embed/${videoId}`
  }
  if (url.includes('soundcloud.com') && !url.includes('w.soundcloud.com/player')) {
    url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`
  }
  return url
})

// Return embed HTML - if it's already an iframe, use it directly; otherwise generate one
const getEmbedHtml = (input) => {
  if (!input) return ''

  const trimmed = input.trim()

  // If it's already HTML (iframe, embed, object), use it directly
  if (trimmed.startsWith('<')) {
    return trimmed
  }

  // Otherwise it's a URL - generate an iframe
  let url = trimmed
  let width = '100%'
  let height = '315'

  // Convert YouTube watch URLs to embed format
  if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
    if (videoId) {
      url = `https://www.youtube.com/embed/${videoId}`
    }
  }

  // Convert SoundCloud URLs to embed format
  if (url.includes('soundcloud.com') && !url.includes('w.soundcloud.com/player')) {
    url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`
    height = '166'
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
  padding: calc(var(--spacing-unit) * 3);
  padding-left: calc(100px + var(--spacing-unit) * 4); /* Align with title column */
  padding-right: calc(240px + var(--spacing-unit) * 4); /* Match right side to tags column */
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-unit) * 2);
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
  align-self: center;
}

.entry-embed :deep(iframe) {
  border: none;
  max-width: 100%;
  box-shadow: 0 0 20px 4px var(--glow-color);
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
}

.entry-text :deep(.inline-embed iframe) {
  border: none;
  max-width: 100%;
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
    padding: calc(var(--spacing-unit) * 2);
    padding-left: calc(80px + var(--spacing-unit) * 3); /* Align with title on mobile */
    padding-right: calc(24px + var(--spacing-unit) * 3); /* Match right side to expand column */
  }
}
</style>
