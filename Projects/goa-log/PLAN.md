# GOA-LOG Implementation Plan

## Tasks

### 1. Fix Sort Order for Same-Date Entries
**File:** `sanity/client.js`

Change the GROQ query from:
```
order(date desc)
```
to:
```
order(date desc, _createdAt desc)
```

This ensures entries posted on the same date appear with most recently created at top.

---

### 2. Search Bar with Tag Autocomplete
**Files:** New `SearchBar.vue` component + modify `LogFeed.vue`

**Behavior:**
- Text input searches both title AND tags
- Autocomplete dropdown shows only matching **tags** (not titles)
- Multiple tags can be selected (chips appear below input)
- Selected tags filter the list (AND logic — entry must have all selected tags)
- Text in the input also filters by title match

**Design:**
```
┌─────────────────────────────────────────┐
│ search...                               │
└─────────────────────────────────────────┘
  [release ×] [remix ×]   ← selected tag chips

Dropdown (appears while typing):
┌─────────────────────────────────────────┐
│ release                                 │
│ remix                                   │
│ recording                               │
└─────────────────────────────────────────┘
```

**Style:** Black border, B612 Mono font, minimal. Tags as small bordered chips with × to remove.

---

### 3. Add Favicon
**Files:** Create `public/favicon.svg` + update `index.html`

Simple red square SVG:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#ff0000"/>
</svg>
```

Update `index.html` link to point to `/favicon.svg`.

---

### 4. Hide + Button When No Expandable Content
**File:** `LogEntry.vue`

Add computed property:
```js
const hasExpandableContent = computed(() => {
  return entry.imageUrl || entry.embedUrl || entry.content
})
```

Conditionally render the + button and disable row click when false.

---

### 5. Remove Border on Image-Only Uploads
**File:** `LogEntry.vue`

Remove or conditionally remove `border: 1px solid var(--border)` from `.entry-image`.

Change from:
```css
.entry-image {
  max-width: 100%;
  height: auto;
  border: 1px solid var(--border);
}
```
to:
```css
.entry-image {
  max-width: 100%;
  height: auto;
}
```

---

### 6. Add 60×60 Red Box Image in Top Right
**Files:** Create `public/corner-image.svg` + modify `LogFeed.vue`

SVG (60×60 red square):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <rect width="60" height="60" fill="#ff0000"/>
</svg>
```

Update header in LogFeed.vue:
```vue
<header class="log-header">
  <h1>goa.log</h1>
  <img src="/corner-image.svg" alt="" class="corner-image" />
</header>
```

CSS:
```css
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* ...existing styles... */
}

.corner-image {
  width: 60px;
  height: 60px;
}
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `sanity/client.js` | Add `_createdAt desc` to sort |
| `src/components/SearchBar.vue` | NEW — search + tag autocomplete |
| `src/components/LogFeed.vue` | Add SearchBar, corner image, filter logic |
| `src/components/LogEntry.vue` | Conditional + button, remove image border |
| `public/favicon.svg` | NEW — red square |
| `public/corner-image.svg` | NEW — 60×60 red square |
| `index.html` | Update favicon link |

---

## Post-Implementation
- Test all features
- `npm run build`
- Deploy to Netlify

---

## Backlog (Future)
- Audio-only uploads
- Audio + image uploads
- "Works" mode (filter to releases)
