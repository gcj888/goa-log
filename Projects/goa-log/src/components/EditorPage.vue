<template>
  <div class="editor-page">

    <!-- ── AUTH GATE ─────────────────────────────────────────────────────── -->
    <div v-if="view === 'auth'" class="auth-gate">
      <h2 class="auth-title">editor</h2>
      <div class="auth-form">
        <input
          v-model="tokenInput"
          type="password"
          placeholder="password"
          class="field-input"
          @keydown.enter="submitAuth"
          autofocus
        />
        <button class="btn-primary" @click="submitAuth">enter</button>
      </div>
      <div v-if="authError" class="error-msg">{{ authError }}</div>
    </div>

    <!-- ── ENTRY LIST ─────────────────────────────────────────────────────── -->
    <div v-else-if="view === 'list'" class="editor-list">
      <div class="list-toolbar">
        <a href="#" class="back-link">← back to feed</a>
        <button class="btn-primary" @click="openNew">+ new entry</button>
      </div>

      <div v-if="listLoading" class="status-msg">loading...</div>
      <div v-else-if="listError" class="error-msg">{{ listError }}</div>

      <div v-else class="list-grid">
        <div class="grid-header">
          <div class="col-date">date</div>
          <div class="col-title">title</div>
          <div class="col-tags">tags</div>
          <div class="col-actions"></div>
        </div>

        <div
          v-for="entry in entries"
          :key="entry._id"
          class="list-row"
          @click="openEdit(entry)"
        >
          <div class="col-date">{{ formatDate(entry) }}</div>
          <div class="col-title" :class="{ 'is-pinned': entry.pinned }">
            {{ entry.title }}
          </div>
          <div class="col-tags">
            <span v-for="tag in (entry.tags || [])" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div class="col-actions" @click.stop>
            <button class="delete-btn" @click="deleteEntry(entry._id)" title="delete">×</button>
          </div>
        </div>

        <div v-if="entries.length === 0" class="status-msg">no entries yet</div>
      </div>
    </div>

    <!-- ── ENTRY FORM ─────────────────────────────────────────────────────── -->
    <div v-else-if="view === 'form'" class="editor-form">
      <div class="form-header">
        <button class="back-link" @click="view = 'list'">← list</button>
        <span class="form-title">{{ editingId ? 'edit entry' : 'new entry' }}</span>
        <div class="form-header-actions">
          <a
            v-if="editingId"
            :href="`/?id=${editingId}#preview`"
            target="_blank"
            class="btn-secondary"
          >preview</a>
          <button
            v-if="editingId"
            class="btn-secondary"
            @click="sendTestEmail"
            :disabled="testEmailSending"
          >{{ testEmailSending ? 'sending...' : 'test email' }}</button>
          <button class="btn-primary" @click="saveEntry" :disabled="saving">
            {{ saving ? 'saving...' : 'save' }}
          </button>
        </div>
      </div>

      <div class="form-body">

        <!-- Meta fields -->
        <div class="field-row field-row--inline">
          <label class="field-label">
            <input type="checkbox" v-model="form.pinned" />
            pinned
          </label>
        </div>

        <div class="field-row" v-if="!form.pinned">
          <label class="field-label">date</label>
          <input type="date" v-model="form.date" class="field-input field-input--date" />
        </div>

        <div class="field-row">
          <label class="field-label">title</label>
          <input
            type="text"
            v-model="form.title"
            class="field-input"
            placeholder="title"
          />
        </div>

        <div class="field-row">
          <label class="field-label">tags</label>
          <div class="field-with-hint">
            <input
              type="text"
              v-model="form.tags"
              class="field-input"
              placeholder="release, music, sketch"
            />
            <span class="field-hint">comma-separated</span>
          </div>
        </div>

        <!-- Block editor -->
        <div class="blocks-section">
          <div class="blocks-header">content blocks</div>

          <div class="blocks-list">
            <div
              v-for="(block, index) in form.blocks"
              :key="block._key"
              class="block-item"
            >
              <div class="block-controls">
                <button
                  class="ctrl-btn"
                  @click="moveBlock(index, -1)"
                  :disabled="index === 0"
                  title="move up"
                >↑</button>
                <button
                  class="ctrl-btn"
                  @click="moveBlock(index, 1)"
                  :disabled="index === form.blocks.length - 1"
                  title="move down"
                >↓</button>
                <span class="block-type-label">{{ block._type.replace('Block', '') }}</span>
                <span v-if="uploading[block._key]" class="uploading-label">uploading...</span>
                <button class="delete-btn" @click="removeBlock(index)" title="remove block">×</button>
              </div>

              <!-- Text block -->
              <div v-if="block._type === 'textBlock'" class="block-body">
                <textarea
                  v-model="block.text"
                  class="field-textarea"
                  placeholder="markdown text..."
                  rows="6"
                ></textarea>
              </div>

              <!-- Embed block -->
              <div v-else-if="block._type === 'embedBlock'" class="block-body">
                <input
                  type="text"
                  v-model="block.url"
                  class="field-input"
                  placeholder="YouTube / SoundCloud / Bandcamp URL or embed code"
                />
              </div>

              <!-- Image block -->
              <div v-else-if="block._type === 'imageBlock'" class="block-body">
                <div v-if="block.imageUrl" class="image-preview">
                  <img :src="block.imageUrl" alt="" />
                </div>
                <div v-if="uploading[block._key]" class="uploading-label">uploading...</div>
                <input
                  v-else
                  type="file"
                  accept="image/*"
                  class="file-input"
                  @change="e => uploadFile(e, index, 'image')"
                />
                <div class="size-options">
                  <label v-for="sz in ['small', 'medium', 'large', 'full']" :key="sz" class="size-option">
                    <input type="radio" v-model="block.size" :value="sz" />
                    {{ sz }}
                  </label>
                </div>
              </div>

              <!-- Audio block -->
              <div v-else-if="block._type === 'audioBlock'" class="block-body">
                <div v-if="block.audioUrl" class="audio-preview">
                  <audio :src="block.audioUrl" controls class="entry-audio"></audio>
                </div>
                <div v-if="uploading[block._key]" class="uploading-label">uploading...</div>
                <input
                  v-else
                  type="file"
                  accept="audio/*"
                  class="file-input"
                  @change="e => uploadFile(e, index, 'audio')"
                />
              </div>

            </div>
          </div>

          <!-- Add block buttons -->
          <div class="add-block-row">
            <button @click="addBlock('textBlock')">+ text</button>
            <button @click="addBlock('embedBlock')">+ embed</button>
            <button @click="addBlock('imageBlock')">+ image</button>
            <button @click="addBlock('audioBlock')">+ audio</button>
          </div>
        </div>

        <div v-if="formError" class="error-msg">{{ formError }}</div>

        <!-- Footer actions (handy on mobile) -->
        <div class="form-footer">
          <button class="btn-primary" @click="saveEntry" :disabled="saving">
            {{ saving ? 'saving...' : 'save' }}
          </button>
          <button v-if="editingId" class="btn-danger" @click="deleteEntry(editingId)">
            delete entry
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

// ── Auth ────────────────────────────────────────────────────────────────────

const AUTH_KEY = 'editor_token'
const view       = ref('auth')
const token      = ref(localStorage.getItem(AUTH_KEY) || '')
const tokenInput = ref('')
const authError  = ref('')

function submitAuth() {
  if (!tokenInput.value.trim()) return
  localStorage.setItem(AUTH_KEY, tokenInput.value.trim())
  token.value = tokenInput.value.trim()
  authError.value = ''
  loadEntries()
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
  token.value = ''
  view.value  = 'auth'
}

onMounted(() => {
  if (token.value) loadEntries()
})

// ── API helper ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const res = await fetch(`/.netlify/functions/entry-write${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token.value}`,
      ...(!isFormData && options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  if (res.status === 401) {
    clearAuth()
    throw new Error('Unauthorized — check your password')
  }
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Entry list ───────────────────────────────────────────────────────────────

const entries     = ref([])
const listLoading = ref(false)
const listError   = ref('')

async function loadEntries() {
  listLoading.value = true
  listError.value   = ''
  try {
    entries.value = await apiFetch('')
    view.value    = 'list'
  } catch (e) {
    if (view.value !== 'auth') listError.value = e.message
    else authError.value = e.message
  } finally {
    listLoading.value = false
  }
}

function formatDate(entry) {
  if (entry.pinned) return 'PINNED'
  if (!entry.date) return '—'
  const d = new Date(entry.date + 'T12:00:00') // noon to avoid timezone shift
  return `${d.getMonth() + 1}.${d.getDate()}.${String(d.getFullYear()).slice(-2)}`
}

// ── Entry form ───────────────────────────────────────────────────────────────

const editingId = ref(null)
const form      = ref(emptyForm())
const saving           = ref(false)
const formError        = ref('')
const uploading        = reactive({}) // keyed by block._key
const testEmailSending = ref(false)

function emptyForm() {
  return {
    pinned: false,
    date: new Date().toISOString().split('T')[0],
    title: '',
    tags: '',
    blocks: [],
  }
}

function openNew() {
  editingId.value = null
  form.value      = emptyForm()
  formError.value = ''
  view.value      = 'form'
}

function openEdit(entry) {
  editingId.value = entry._id
  form.value = {
    pinned: entry.pinned ?? false,
    date: entry.date ?? new Date().toISOString().split('T')[0],
    title: entry.title ?? '',
    tags: (entry.tags ?? []).join(', '),
    blocks: (entry.blocks ?? []).map(b => ({ ...b })),
  }
  formError.value = ''
  view.value      = 'form'
}

// ── Block management ─────────────────────────────────────────────────────────

function randomKey() {
  return Math.random().toString(16).slice(2, 14)
}

function addBlock(type) {
  const key  = randomKey()
  const base = { _type: type, _key: key }
  switch (type) {
    case 'textBlock':
      form.value.blocks.push({ ...base, text: '' })
      break
    case 'embedBlock':
      form.value.blocks.push({ ...base, url: '' })
      break
    case 'imageBlock':
      form.value.blocks.push({ ...base, imageUrl: '', imageRef: '', size: 'full' })
      break
    case 'audioBlock':
      form.value.blocks.push({ ...base, audioUrl: '', audioRef: '' })
      break
  }
}

function removeBlock(index) {
  form.value.blocks.splice(index, 1)
}

function moveBlock(index, direction) {
  const blocks = form.value.blocks
  const target = index + direction
  if (target < 0 || target >= blocks.length) return
  const [block] = blocks.splice(index, 1)
  blocks.splice(target, 0, block)
}

// ── File upload ──────────────────────────────────────────────────────────────

async function uploadFile(event, index, type) {
  const file = event.target.files?.[0]
  if (!file) return

  const block = form.value.blocks[index]
  uploading[block._key] = true
  formError.value = ''

  try {
    const fd = new FormData()
    fd.append('file', file)

    const result = await apiFetch(`?upload=${type}`, {
      method: 'POST',
      body: fd,
    })

    if (type === 'image') {
      block.imageRef = result._ref
      block.imageUrl = result.url
    } else {
      block.audioRef = result._ref
      block.audioUrl = result.url
    }
  } catch (e) {
    formError.value = `Upload failed: ${e.message}`
  } finally {
    uploading[block._key] = false
  }
}

// ── Save / Delete ────────────────────────────────────────────────────────────

async function saveEntry() {
  if (!form.value.title.trim()) {
    formError.value = 'Title is required'
    return
  }

  saving.value    = true
  formError.value = ''

  const payload = {
    pinned: form.value.pinned,
    date: form.value.pinned ? null : form.value.date,
    title: form.value.title.trim(),
    tags: form.value.tags.split(',').map(t => t.trim()).filter(Boolean),
    blocks: form.value.blocks,
  }

  try {
    if (editingId.value) {
      await apiFetch(`?id=${editingId.value}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    } else {
      await apiFetch('', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }
    await loadEntries() // returns to list view on success
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function sendTestEmail() {
  if (!editingId.value) return
  testEmailSending.value = true
  formError.value = ''
  try {
    const res = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
      },
      body: JSON.stringify({ entryId: editingId.value, testEmail: 'gclarkjones@gmail.com' }),
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message || 'Test email sent!')
    } else {
      formError.value = `Email failed: ${data.error}`
    }
  } catch (e) {
    formError.value = `Email failed: ${e.message}`
  } finally {
    testEmailSending.value = false
  }
}

async function deleteEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return
  try {
    await apiFetch(`?id=${id}`, { method: 'DELETE' })
    if (view.value === 'form') view.value = 'list'
    await loadEntries()
  } catch (e) {
    listError.value = e.message
  }
}
</script>

<style scoped>
.editor-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: calc(var(--spacing-unit) * 4);
  min-height: 100vh;
}

/* ── Auth gate ─────────────────────────────────────────────────────────────── */

.auth-gate {
  max-width: 360px;
  margin: calc(var(--spacing-unit) * 10) auto;
}

.auth-title {
  font-family: 'p22-morris-troy', sans-serif;
  font-size: 28px;
  font-weight: 700;
  text-transform: lowercase;
  margin-bottom: calc(var(--spacing-unit) * 3);
}

.auth-form {
  display: flex;
  gap: var(--spacing-unit);
}

/* ── Entry list ───────────────────────────────────────────────────────────── */

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(var(--spacing-unit) * 2) 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: calc(var(--spacing-unit));
}

.grid-header,
.list-row {
  display: grid;
  grid-template-columns: 100px 1fr 240px 48px;
  gap: calc(var(--spacing-unit) * 2);
  padding: calc(var(--spacing-unit) * 1.5) calc(var(--spacing-unit) * 2);
}

.grid-header {
  font-family: 'p22-morris-troy', sans-serif;
  font-size: 14px;
  font-weight: 400;
  border-bottom: 1px solid var(--border);
  opacity: 0.5;
}

.list-row {
  cursor: pointer;
  border-bottom: 1px solid transparent;
}

.list-row:hover {
  background: rgba(0, 0, 0, 0.04);
}

.col-date,
.col-title,
.col-tags,
.col-actions {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.col-title.is-pinned {
  background: var(--highlight-bg);
  padding: 0 4px;
  margin: 0 -4px;
}

.col-tags {
  gap: var(--spacing-unit);
  flex-wrap: wrap;
}

.col-actions {
  justify-content: flex-end;
}

.tag {
  padding: 2px 6px;
  border: 1px solid var(--border);
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Entry form ───────────────────────────────────────────────────────────── */

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(var(--spacing-unit) * 2) 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: calc(var(--spacing-unit) * 4);
  gap: calc(var(--spacing-unit) * 2);
}

.form-title {
  font-family: 'p22-morris-troy', sans-serif;
  font-size: 20px;
  font-weight: 400;
  text-transform: lowercase;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-unit) * 3);
  max-width: 800px;
}

.field-row {
  display: flex;
  align-items: baseline;
  gap: calc(var(--spacing-unit) * 2);
}

.field-row--inline {
  align-items: center;
}

.field-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 13px;
  opacity: 0.55;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-with-hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.field-hint {
  font-size: 11px;
  opacity: 0.4;
}

.field-input {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 15px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 5px 8px;
  outline: none;
  min-width: 0;
}

.field-input--date {
  flex: 0 0 auto;
  width: 160px;
}

.field-input:focus {
  box-shadow: 0 0 0 1px var(--text);
}

.field-textarea {
  width: 100%;
  font-family: var(--font-mono);
  font-size: 14px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 8px;
  outline: none;
  resize: vertical;
  line-height: 1.5;
}

.field-textarea:focus {
  box-shadow: 0 0 0 1px var(--text);
}

/* ── Blocks ────────────────────────────────────────────────────────────────── */

.blocks-section {
  border-top: 1px solid var(--border);
  padding-top: calc(var(--spacing-unit) * 3);
}

.blocks-header {
  font-size: 12px;
  opacity: 0.5;
  margin-bottom: calc(var(--spacing-unit) * 2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.block-item {
  border: 1px solid var(--border);
  margin-bottom: calc(var(--spacing-unit) * 2);
}

.block-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-unit);
  padding: calc(var(--spacing-unit) * 0.75) calc(var(--spacing-unit) * 1.5);
  border-bottom: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.025);
}

.block-type-label {
  font-size: 11px;
  opacity: 0.45;
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.uploading-label {
  font-size: 11px;
  opacity: 0.6;
  flex: 1;
}

.ctrl-btn {
  font-family: var(--font-mono);
  font-size: 14px;
  opacity: 0.5;
  padding: 0 4px;
  background: none;
  border: none;
  cursor: pointer;
  line-height: 1;
}

.ctrl-btn:hover {
  opacity: 1;
}

.ctrl-btn:disabled {
  opacity: 0.2;
  cursor: default;
}

.block-body {
  padding: calc(var(--spacing-unit) * 2);
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-unit) * 1.5);
}

.add-block-row {
  display: flex;
  gap: var(--spacing-unit);
  flex-wrap: wrap;
  margin-top: calc(var(--spacing-unit) * 2);
}

.add-block-row button {
  padding: 5px 12px;
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 13px;
  background: none;
  color: var(--text);
  cursor: pointer;
}

.add-block-row button:hover {
  background: var(--text);
  color: var(--bg);
}

.size-options {
  display: flex;
  gap: calc(var(--spacing-unit) * 2);
  flex-wrap: wrap;
}

.size-option {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.image-preview img {
  max-width: 200px;
  max-height: 160px;
  object-fit: contain;
  display: block;
}

.audio-preview .entry-audio {
  width: 100%;
  max-width: 400px;
  display: block;
}

.file-input {
  font-family: var(--font-mono);
  font-size: 13px;
}

/* ── Buttons ────────────────────────────────────────────────────────────────── */

.form-header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-unit);
  flex-wrap: wrap;
}

.btn-secondary {
  padding: 5px 14px;
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 13px;
  background: none;
  color: var(--text);
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  flex-shrink: 0;
}

.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.06);
}

.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  padding: 5px 14px;
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--text);
  color: var(--bg);
  cursor: pointer;
  flex-shrink: 0;
}

.btn-primary:hover {
  opacity: 0.8;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-danger {
  padding: 5px 14px;
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 13px;
  background: none;
  color: var(--text);
  cursor: pointer;
}

.btn-danger:hover {
  background: #cc0000;
  color: #ffffff;
  border-color: #cc0000;
}

.delete-btn {
  font-size: 18px;
  opacity: 0.35;
  padding: 0 2px;
  background: none;
  border: none;
  cursor: pointer;
  line-height: 1;
  font-family: var(--font-mono);
}

.delete-btn:hover {
  opacity: 1;
}

.back-link {
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
  color: var(--text);
  background: none;
  border: none;
  font-family: var(--font-mono);
  padding: 0;
  opacity: 0.6;
}

.back-link:hover {
  opacity: 1;
}

/* ── Status / Error ─────────────────────────────────────────────────────────── */

.status-msg {
  padding: calc(var(--spacing-unit) * 2) calc(var(--spacing-unit) * 2);
  opacity: 0.5;
  font-size: 13px;
}

.error-msg {
  color: #cc0000;
  font-size: 13px;
  padding: var(--spacing-unit) 0;
}

.form-footer {
  display: flex;
  gap: calc(var(--spacing-unit) * 2);
  padding-top: calc(var(--spacing-unit) * 3);
  border-top: 1px solid var(--border);
  padding-bottom: calc(var(--spacing-unit) * 4);
}

/* ── Mobile ─────────────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .editor-page {
    padding: calc(var(--spacing-unit) * 2);
  }

  .auth-gate {
    margin-top: calc(var(--spacing-unit) * 6);
  }

  .auth-form {
    flex-direction: column;
  }

  .grid-header,
  .list-row {
    grid-template-columns: 70px 1fr 36px;
    gap: var(--spacing-unit);
    padding: calc(var(--spacing-unit) * 1.5) var(--spacing-unit);
  }

  .col-tags {
    display: none;
  }

  .col-title {
    white-space: normal;
    line-height: 1.3;
  }

  .field-row {
    flex-direction: column;
    gap: calc(var(--spacing-unit) * 0.75);
  }

  .field-row--inline {
    flex-direction: row;
    flex-wrap: wrap;
    gap: calc(var(--spacing-unit) * 2);
  }

  .field-label {
    width: auto;
    opacity: 0.7;
  }

  .field-input {
    flex: none;
    width: 100%;
  }

  .field-input--date {
    width: 100%;
  }

  .field-with-hint {
    width: 100%;
  }

  .form-header {
    flex-wrap: wrap;
    gap: var(--spacing-unit);
  }

  .add-block-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .size-options {
    gap: calc(var(--spacing-unit) * 1.5);
  }
}
</style>
