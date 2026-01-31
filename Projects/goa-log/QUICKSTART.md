# Quick Start Guide

Get goa.log running in 10 minutes.

## Step 1: Run the Frontend Locally (2 minutes)

```bash
cd goa-log
npm install
npm run dev
```

Open http://localhost:5173 - you'll see mock data already working!

## Step 2: Set Up Sanity CMS (5 minutes)

```bash
# Install Sanity CLI
npm install -g @sanity/cli

# Create new project
sanity init
# Choose: "Create new project"
# Name it: "goa-log-cms"
# Use default dataset
# Choose: "Clean project with no predefined schemas"

# Navigate to your new Sanity project
cd ../goa-log-cms  # or whatever you named it

# Copy the schema
# Copy content from goa-log/sanity/logEntry.schema.js
# Paste it into goa-log-cms/schemas/logEntry.js

# Update schemas/index.js:
# import logEntry from './logEntry'
# export const schemaTypes = [logEntry]

# Start the Studio
sanity start
```

Studio opens at http://localhost:3333

## Step 3: Connect Frontend to Sanity (2 minutes)

1. In Sanity Studio, go to Vision tab or run `sanity manage` to get your Project ID
2. Open `goa-log/sanity/client.js` and add your Project ID:

```javascript
projectId: 'abc12345',  // Your actual ID here
```

3. In `goa-log/src/components/LogFeed.vue`, uncomment lines 81-82:

```javascript
// Uncomment these:
import { getEntries } from '../sanity/client'
const data = await getEntries()
entries.value = data

// Comment out:
// entries.value = mockEntries
```

4. Restart your dev server

## Step 4: Add Your First Entry (1 minute)

1. Go to http://localhost:3333 (Sanity Studio)
2. Click "Log Entry" → "+"
3. Fill in:
   - Title: "my first entry"
   - Tags: "test"
   - Media Type: "Text Only"
   - Content: "this is a test entry"
4. Click "Publish"

Refresh your frontend - your entry should appear!

## Step 5: Deploy (When Ready)

### Deploy Sanity Studio:
```bash
cd goa-log-cms
sanity deploy
```

### Deploy Frontend to Netlify:
```bash
cd goa-log
npm run build
netlify deploy --prod
```

Or connect your GitHub repo to Netlify for automatic deploys.

---

**That's it!** You now have:
- ✅ A working frontend
- ✅ A CMS to add content
- ✅ Your first entry live

Read the main README.md for customization options.
