<template>
  <div class="log-feed" :class="{ 'has-highlight': highlightedId }" @mousemove="handleMouseMove" @touchstart="handleTouch">
    <!-- Mist overlay -->
    <div class="mist-overlay" :class="{ visible: showOverlay, fading: isFading }"></div>

    <header class="log-header">
      <div class="header-left">
        <h1>cabbages.info</h1>
        <div class="header-links">
          <a href="mailto:gclarkjones@gmail.com" class="contact-link">contact</a>
          <form class="subscribe-form" @submit.prevent="handleSubscribe">
            <input
              v-model="subscribeEmail"
              type="email"
              placeholder="email"
              class="subscribe-input"
              :disabled="subscribeState === 'sending'"
            />
            <button type="submit" class="subscribe-button" :disabled="subscribeState === 'sending'">
              {{ subscribeState === 'sending' ? '...' : subscribeState === 'done' ? 'ok!' : 'subscribe' }}
            </button>
          </form>
          <span v-if="subscribeMessage" class="subscribe-message">{{ subscribeMessage }}</span>
        </div>
      </div>
      <img src="/pot.png" alt="" class="corner-image" />
    </header>

    <SearchBar :allTags="allTags" @filter="handleFilter" />

    <div class="log-grid">
      <!-- Header row -->
      <div class="grid-header">
        <div class="col-date">date</div>
        <div class="col-title">title</div>
        <div class="col-tags">tags</div>
        <div class="col-expand"></div>
      </div>

      <!-- Entry rows -->
      <LogEntry
        v-for="entry in filteredEntries"
        :key="entry._id"
        :entry="entry"
        :isHighlighted="highlightedId === entry._id"
        :isRevealing="isFading"
        :mistActive="showOverlay"
      />
    </div>

    <div v-if="loading" class="loading">loading...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import LogEntry from './LogEntry.vue'
import SearchBar from './SearchBar.vue'
import { getEntries } from '../../sanity/client'

const entries = ref([])
const loading = ref(true)
const error = ref(null)

// Subscribe form
const subscribeEmail = ref('')
const subscribeState = ref('idle') // idle, sending, done
const subscribeMessage = ref('')

async function handleSubscribe() {
  if (!subscribeEmail.value) return
  subscribeState.value = 'sending'
  subscribeMessage.value = ''
  try {
    const res = await fetch('/.netlify/functions/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: subscribeEmail.value }),
    })
    const data = await res.json()
    subscribeState.value = 'done'
    subscribeMessage.value = data.message || 'Subscribed!'
    subscribeEmail.value = ''
    setTimeout(() => {
      subscribeState.value = 'idle'
      subscribeMessage.value = ''
    }, 3000)
  } catch {
    subscribeState.value = 'idle'
    subscribeMessage.value = 'error, try again'
    setTimeout(() => { subscribeMessage.value = '' }, 3000)
  }
}

// Check hash immediately so overlay shows before content loads
const initialHash = window.location.hash.slice(1)
const highlightedId = ref(initialHash || null)
const showOverlay = ref(!!initialHash)
const isFading = ref(false)
let mouseMoveDuration = 0
let mouseMoveInterval = null

// Filter state
const filterText = ref('')
const filterTags = ref([])

// Get all unique tags from entries
const allTags = computed(() => {
  const tags = new Set()
  entries.value.forEach(entry => {
    if (entry.tags) {
      entry.tags.forEach(tag => tags.add(tag))
    }
  })
  return Array.from(tags).sort()
})

// Filtered entries based on search text and selected tags
const filteredEntries = computed(() => {
  return entries.value.filter(entry => {
    // Check text filter (searches title)
    const textMatch = !filterText.value ||
      entry.title?.toLowerCase().includes(filterText.value.toLowerCase())

    // Check tag filter (AND logic - must have ALL selected tags)
    const tagMatch = filterTags.value.length === 0 ||
      filterTags.value.every(tag => entry.tags?.includes(tag))

    return textMatch && tagMatch
  })
})

const handleFilter = ({ text, tags }) => {
  filterText.value = text
  filterTags.value = tags
}

const dismissOverlay = () => {
  if (isFading.value) return
  isFading.value = true

  setTimeout(() => {
    showOverlay.value = false
    highlightedId.value = null
    isFading.value = false
    mouseMoveDuration = 0
  }, 1500)
}

const handleMouseMove = () => {
  if (!highlightedId.value || isFading.value) return

  // Start tracking mouse movement
  if (!mouseMoveInterval) {
    mouseMoveInterval = setInterval(() => {
      mouseMoveDuration += 100
      if (mouseMoveDuration >= 500) {
        clearInterval(mouseMoveInterval)
        mouseMoveInterval = null
        dismissOverlay()
      }
    }, 100)
  }
}

// Touch dismisses immediately
const handleTouch = () => {
  if (!highlightedId.value) return
  dismissOverlay()
}

onMounted(async () => {
  try {
    const data = await getEntries()
    entries.value = data

    // If we have a hash, verify the entry exists and scroll to it
    if (highlightedId.value) {
      const matchedEntry = entries.value.find(e => e._id === highlightedId.value)
      if (matchedEntry) {
        // Scroll to the highlighted entry instantly
        setTimeout(() => {
          const el = document.querySelector('.log-entry.highlighted')
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' })
          }
        }, 0)
      } else {
        // Hash doesn't match any entry, clear overlay
        highlightedId.value = null
        showOverlay.value = false
      }
    }
  } catch (err) {
    error.value = 'Failed to load entries'
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.log-feed {
  max-width: 1400px;
  margin: 0 auto;
  padding: calc(var(--spacing-unit) * 4);
  position: relative;
}

.mist-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, hsl(22, 70%, 35%) 0%, hsl(25, 70%, 45%) 100%);
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  transition: opacity 10s ease-out;
}

.mist-overlay.visible {
  opacity: 1;
}

.mist-overlay.fading {
  opacity: 0;
  transition: opacity 15s ease-out;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: calc(var(--spacing-unit) * 4);
  border-bottom: 1px solid var(--border);
  padding-bottom: calc(var(--spacing-unit) * 2);
}

.corner-image {
  width: 120px;
  height: 150px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-unit) * 1.5);
}

.log-header h1 {
  font-family: 'IBM Plex Sans Condensed', sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.header-links {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.contact-link {
  font-size: 13px;
}

.subscribe-form {
  display: flex;
  align-items: center;
  gap: 4px;
}

.subscribe-input {
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 2px 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  width: 140px;
  outline: none;
}

.subscribe-input:focus {
  box-shadow: 0 0 0 1px var(--text);
}

.subscribe-button {
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
}

.subscribe-button:hover {
  opacity: 0.7;
}

.subscribe-message {
  font-size: 12px;
  opacity: 0.6;
}

.log-grid {
  border: none;
}

.grid-header {
  display: grid;
  grid-template-columns: 100px 1fr 240px 32px;
  gap: calc(var(--spacing-unit) * 2);
  padding: calc(var(--spacing-unit) * 2);
  font-weight: 700;
}

.col-date,
.col-title,
.col-tags,
.col-expand {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading,
.error {
  padding: calc(var(--spacing-unit) * 4);
  text-align: center;
}

.error {
  color: #ff0000;
}

/* Responsive */
@media (max-width: 768px) {
  .log-feed {
    padding: calc(var(--spacing-unit) * 2);
  }

  .grid-header {
    grid-template-columns: 80px 1fr 24px;
    gap: calc(var(--spacing-unit));
  }

  .col-tags {
    display: none;
  }
}
</style>
