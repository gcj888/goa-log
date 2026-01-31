# goa.log

A minimal, spreadsheet-inspired log for creative work. Post sketches, releases, notes, images, and embeds in a clean monospace interface.

## Features

- Spreadsheet-style grid layout
- Collapsible entries with expandable content
- Support for text, images, and embeds (YouTube, SoundCloud, Bandcamp)
- Simple tagging system with conditional highlighting
- Mobile responsive
- B612 Mono monospace font throughout

## Tech Stack

- **Frontend**: Vue 3 + Vite
- **CMS**: Sanity.io (headless CMS)
- **Hosting**: Netlify (or any static host)
- **Styling**: Vanilla CSS with CSS variables

## Setup Instructions

### 1. Frontend Setup (This Project)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### 2. Sanity CMS Setup

#### Create a Sanity Project

```bash
# Install Sanity CLI globally
npm install -g @sanity/cli

# Create a new Sanity project
sanity init

# Follow the prompts:
# - Create new project
# - Choose a project name (e.g., "goa-log-cms")
# - Use the default dataset configuration
# - Choose "Clean project with no predefined schemas"
```

#### Add the Schema

1. Navigate to your Sanity project folder
2. Copy the schema from `sanity/logEntry.schema.js` in this project
3. Add it to your `schemas/` folder in your Sanity project
4. Import it in `schemas/index.js`:

```javascript
import logEntry from './logEntry'

export const schemaTypes = [logEntry]
```

#### Start Sanity Studio

```bash
cd your-sanity-project
sanity start
```

This will start the Sanity Studio at `http://localhost:3333`

#### Deploy Sanity Studio

```bash
sanity deploy
```

This gives you a hosted studio at `your-project.sanity.studio`

### 3. Connect Frontend to Sanity

1. Get your Project ID from Sanity dashboard or by running `sanity manage`
2. Update `sanity/client.js` with your project ID:

```javascript
projectId: 'YOUR_PROJECT_ID_HERE',
```

3. In `LogFeed.vue`, uncomment the Sanity query and comment out mock data:

```javascript
// Replace this:
entries.value = mockEntries

// With this:
import { getEntries } from '../sanity/client'
const data = await getEntries()
entries.value = data
```

### 4. Deploy to Netlify

#### Option A: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build your site
npm run build

# Deploy
netlify deploy --prod
```

#### Option B: GitHub + Netlify

1. Push this project to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect to your GitHub repo
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Deploy!

### 5. Adding Content

1. Go to your Sanity Studio (hosted or local)
2. Click "Log Entry" → "Create new"
3. Fill in:
   - **Date**: Auto-fills with today
   - **Title**: Your entry text (shows when collapsed)
   - **Tags**: Add tags like "release", "sketch", "idea"
   - **Media Type**: Choose text/image/embed
   - **Content**: Additional text (for expanded view)
   - **Image**: Upload if media type is image
   - **Embed URL**: Paste YouTube/SoundCloud/Bandcamp URL if embed
4. Publish!

The frontend will automatically fetch new entries.

## Tag System

Tags are simple text chips. Special behavior:
- **"release" tag**: Highlights the title with yellow background
- Other tags are just visual labels

To add more conditional formatting, edit the `isRelease` computed property in `LogEntry.vue` and add CSS classes.

## Customization

### Colors

Edit CSS variables in `src/style.css`:

```css
:root {
  --bg: #ffffff;
  --text: #000000;
  --border: #000000;
  --highlight-bg: #ffff00;  /* "release" tag highlight */
}
```

### Font

Change the Google Fonts import in `src/style.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=YOUR_FONT&display=swap');

:root {
  --font-mono: 'Your Font', monospace;
}
```

### Layout

Adjust grid columns in `LogFeed.vue` and `LogEntry.vue`:

```css
grid-template-columns: 120px 1fr 200px 40px;
/* date, title, tags, expand button */
```

## Embed Support

Currently supports:
- **YouTube**: Paste any YouTube URL
- **SoundCloud**: Paste track or playlist URL
- **Bandcamp**: Paste album or track URL

To add more services, edit the `getEmbedUrl()` function in `LogEntry.vue`.

## Development Notes

- Mock data is currently active in `LogFeed.vue` for testing
- Uncomment Sanity queries once you've set up your project
- The site is fully static - no server needed!
- Images are hosted by Sanity's CDN

## Roadmap / Future Ideas

- [ ] Audio file hosting (.wav support)
- [ ] Search/filter functionality
- [ ] Tag filtering (click a tag to see all entries with that tag)
- [ ] Markdown support in content field
- [ ] Dark mode toggle
- [ ] RSS feed generation
- [ ] Analytics

## License

MIT - do whatever you want with this!
