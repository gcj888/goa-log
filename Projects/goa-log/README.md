# cabbages.info

A minimal, monospace log for creative work. Post notes, releases, sketches, images, audio, and embeds (YouTube, SoundCloud, Bandcamp) in a clean spreadsheet-style interface.

Live at [cabbages.info](https://cabbages.info)

## How it works

Content lives in **Sanity CMS**. The frontend fetches entries and displays them in a collapsible grid. Each entry can contain text (markdown), images, audio, and embeds arranged as blocks.

### Key features

- Spreadsheet-style grid with collapsible rows
- Block-based content: mix text, images, audio, and embeds in any order
- Embed support for YouTube, SoundCloud, and Bandcamp (with glow effect)
- Tag system with search/filter (AND logic for multiple tags)
- "Release" tag highlights entries with yellow background
- Preview mode for reviewing the latest entry before sharing
- Hash-based deep links to specific entries (with mist overlay reveal)
- Mobile responsive

## Project structure

```
Projects/goa-log/
  src/
    App.vue              # Hash router: #preview -> PreviewPage, else LogFeed
    style.css            # Global styles, CSS variables, fonts
    components/
      LogFeed.vue        # Main feed — grid of all entries with search
      LogEntry.vue       # Single entry row — expand/collapse, content rendering
      SearchBar.vue      # Tag autocomplete + text search
      PreviewPage.vue    # Latest entry preview (for email drafting)
  sanity/
    client.js            # Sanity API client (getEntries, getLatestEntry)
  goa-log-cms/
    schemaTypes/
      logEntry.js        # Sanity schema — entry fields, block types
```

## Running locally

```bash
# Frontend
npm install
npm run dev          # http://localhost:5173

# Sanity Studio (CMS)
cd goa-log-cms
npm install
npx sanity dev       # http://localhost:3333
```

## Preview mode

Navigate to `/#preview` to see the most recent entry rendered on its own page. This is useful for reviewing how a post will look before sharing or emailing it.

## Adding content in Sanity

1. Open Sanity Studio
2. Create a new **Log Entry**
3. Fill in date, title, and tags
4. Add **blocks** in the content area:
   - **Text Block** — markdown text (supports inline embed URLs on their own line)
   - **Image Block** — upload an image, choose size (small/medium/large/full)
   - **Audio Block** — upload an audio file
   - **Embed Block** — paste a YouTube, SoundCloud, or Bandcamp URL
5. Publish

### Embed tips

- **Embed Block**: Paste a plain URL. The frontend converts it to the appropriate iframe.
- **Text Block**: You can also paste a YouTube/SoundCloud/Bandcamp URL on its own line in a text block and it will auto-embed.
- Bandcamp album/track page URLs render as styled links. Bandcamp EmbeddedPlayer URLs render as iframes.

## Email newsletter

Emails are sent directly from Sanity Studio using Resend, with subscriber signups collected on the site.

### Sending an email

1. Create or edit a log entry in Sanity Studio
2. Publish the entry
3. Click the **Send Email** button (in the document actions menu)
4. Confirm — email goes to all subscribers immediately

### Subscriber sources

- **Site signup form**: visitors enter their email in the header
- **Sanity Studio**: subscriber documents can be added/managed directly
- **Google Sheet** (optional): publish a sheet as CSV, set `GOOGLE_SHEET_CSV_URL` env var — emails are merged with Sanity subscribers

### How it works

- `netlify/functions/subscribe.mjs` — handles signups, saves to Sanity, sends welcome email
- `netlify/functions/send-email.mjs` — sends entry to all subscribers via Resend
- `scripts/email-renderer.js` — shared email HTML renderer (inline CSS, email-safe)
- `scripts/generate-feed.js` — RSS feed at `/feed.xml` (also uses shared renderer)

### Email design

Emails match the visual style of the preview page:
- IBM Plex Mono font
- Same header: date, title, tags
- Centered embeds with glow effect (YouTube thumbnails, SoundCloud/Bandcamp links)
- Release tag highlighting
- "View on cabbages.info" footer link

### Environment variables (Netlify dashboard)

- `RESEND_API_KEY` — from resend.com
- `SANITY_WRITE_TOKEN` — from sanity.io/manage → API → Tokens
- `SEND_EMAIL_SECRET` — random string, authorizes the send-email function
- `GOOGLE_SHEET_CSV_URL` — (optional) published Google Sheet CSV for manual subscriber list
- `SANITY_STUDIO_SEND_EMAIL_SECRET` — same as SEND_EMAIL_SECRET, for Sanity Studio env

## Deploying

The site deploys to **Netlify** automatically when changes are pushed to the `main` branch.

```bash
npm run build        # Build to dist/
```

Build command: `npm run build`
Publish directory: `dist`

## Customization

### CSS variables (src/style.css)

```css
:root {
  --bg: #ffffff;
  --text: #000000;
  --border: #000000;
  --highlight-bg: #FFEB3B;
  --spacing-unit: 8px;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

### Embed glow

Embeds get a random glow color from a curated palette (rust, gold, blue). This is generated per-entry via the `glowColor` computed property and applied as a CSS `box-shadow`.

## Tech stack

- **Frontend**: Vue 3 + Vite
- **CMS**: Sanity.io
- **Hosting**: Netlify
- **Fonts**: IBM Plex Mono, IBM Plex Sans Condensed
- **Markdown**: marked

## License

MIT
