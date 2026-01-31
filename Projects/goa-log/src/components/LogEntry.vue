<template>
  <div class="log-entry" :class="{ expanded: isExpanded }">
    <!-- Collapsed row view -->
    <div class="entry-row" :class="{ clickable: hasExpandableContent }" @click="hasExpandableContent && toggleExpand()">
      <div class="col-date">{{ formattedDate }}</div>
      <div class="col-title" :class="{ 'is-release': isRelease }">
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
        <!-- Image (for image or audioImage types) -->
        <img
          v-if="['image', 'audioImage'].includes(entry.mediaType) && entry.imageUrl"
          :src="entry.imageUrl"
          alt=""
          class="entry-image"
        />

        <!-- Audio -->
        <audio
          v-if="['audio', 'audioImage'].includes(entry.mediaType) && entry.audioUrl"
          :src="entry.audioUrl"
          controls
          class="entry-audio"
        ></audio>

        <!-- Embed -->
        <div
          v-if="entry.mediaType === 'embed' && entry.embedUrl"
          class="entry-embed"
        >
          <iframe
            :src="getEmbedInfo(entry.embedUrl).url"
            :style="getEmbedInfo(entry.embedUrl).style"
            frameborder="0"
            allowfullscreen
          ></iframe>
        </div>

        <!-- Text content -->
        <div v-if="entry.content" class="entry-text">
          {{ entry.content }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

const isExpanded = ref(false)

const formattedDate = computed(() => {
  const date = new Date(props.entry.date)
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
})

const isRelease = computed(() => {
  return props.entry.tags?.includes('release')
})

const hasExpandableContent = computed(() => {
  return props.entry.imageUrl || props.entry.embedUrl || props.entry.audioUrl || props.entry.content
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// Parse embed input and return URL + style info
const getEmbedInfo = (input) => {
  if (!input) return { url: '', style: {} }

  let cleanInput = input.trim()
  let width = null
  let height = null

  // Extract info from iframe HTML if present
  if (cleanInput.includes('<iframe')) {
    // Extract src URL
    const srcMatch = cleanInput.match(/src=["']([^"']+)["']/)
    if (srcMatch) {
      cleanInput = srcMatch[1]
    }

    // Extract width (look for width attribute or style - supports px and %)
    const widthAttrMatch = input.match(/width=["']?(\d+%?)/)
    const widthStyleMatch = input.match(/width:\s*(\d+(?:px|%)?)/)
    if (widthAttrMatch) width = widthAttrMatch[1]
    else if (widthStyleMatch) width = widthStyleMatch[1]

    // Extract height (look for height attribute or style - supports px and %)
    const heightAttrMatch = input.match(/height=["']?(\d+%?)/)
    const heightStyleMatch = input.match(/height:\s*(\d+(?:px|%)?)/)
    if (heightAttrMatch) height = heightAttrMatch[1]
    else if (heightStyleMatch) height = heightStyleMatch[1]
  }

  let finalUrl = cleanInput

  // Convert YouTube URLs to embed format
  if (cleanInput.includes('youtube.com') || cleanInput.includes('youtu.be')) {
    const videoId = cleanInput.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]
    if (videoId) {
      finalUrl = `https://www.youtube.com/embed/${videoId}`
    }
    // Default YouTube dimensions if not specified
    if (!width) width = '560'
    if (!height) height = '315'
  }

  // SoundCloud embeds
  if (cleanInput.includes('soundcloud.com') && !cleanInput.includes('w.soundcloud.com/player')) {
    finalUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(cleanInput)}&auto_play=false`
    // Default SoundCloud player height if not specified
    if (!height) height = '166'
  }

  // Build style object with dimensions
  const style = {}
  if (width) {
    // Add 'px' suffix only if it's a plain number
    style.width = width.includes('%') ? width : `${width}px`
  }
  if (height) {
    style.height = height.includes('%') ? height : `${height}px`
  }

  return { url: finalUrl, style }
}
</script>

<style scoped>
.log-entry {
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

.col-title.is-release {
  background: var(--highlight-bg);
  padding: 0 4px;
  margin: 0 -4px;
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
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-unit) * 2);
}

.entry-image {
  max-width: 100%;
  height: auto;
}

.entry-audio {
  width: 100%;
  max-width: 500px;
}

.entry-embed {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.entry-embed iframe {
  display: block;
  margin: 0 auto;
  border: none;
  max-width: min(100%, 700px);
}

.entry-text {
  white-space: pre-wrap;
  line-height: 1.6;
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
  }
}
</style>
