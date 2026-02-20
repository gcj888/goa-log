/**
 * entry-write.mjs — Netlify Function
 *
 * Handles all Sanity write operations for the custom editor at /#editor.
 * Auth: Authorization: Bearer {SEND_EMAIL_SECRET} (same secret as send-email)
 *
 * Routes:
 *   GET    /entry-write              → list all entries
 *   POST   /entry-write              → create entry
 *   PATCH  /entry-write?id=xxx       → update entry
 *   DELETE /entry-write?id=xxx       → delete entry
 *   POST   /entry-write?upload=image → upload image asset, return { _ref, url }
 *   POST   /entry-write?upload=audio → upload audio asset, return { _ref, url }
 */

import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: 'vxhzzkqz',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
})

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://cabbages.info',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function randomKey() {
  return Math.random().toString(16).slice(2, 14)
}

function buildBlocks(blocks) {
  return (blocks ?? []).map(block => {
    const base = {
      _type: block._type,
      _key: block._key || randomKey(),
    }
    switch (block._type) {
      case 'textBlock':
        return { ...base, text: block.text ?? '' }
      case 'embedBlock':
        return { ...base, url: block.url ?? '' }
      case 'imageBlock':
        return {
          ...base,
          size: block.size ?? 'full',
          image: block.imageRef
            ? { _type: 'image', asset: { _type: 'reference', _ref: block.imageRef } }
            : undefined,
        }
      case 'audioBlock':
        return {
          ...base,
          audio: block.audioRef
            ? { _type: 'file', asset: { _type: 'reference', _ref: block.audioRef } }
            : undefined,
        }
      default:
        return base
    }
  })
}

function buildDocument(body) {
  return {
    _type: 'logEntry',
    pinned: body.pinned ?? false,
    ...(body.pinned ? {} : { date: body.date }),
    title: body.title,
    tags: body.tags ?? [],
    blocks: buildBlocks(body.blocks),
  }
}

export default async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  // Auth check
  const authHeader = req.headers.get('authorization')
  const secret = process.env.SEND_EMAIL_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const uploadType = url.searchParams.get('upload') // 'image' or 'audio'

  try {
    // ── GET: list all entries ────────────────────────────────────────────────
    if (req.method === 'GET') {
      const entries = await sanityClient.fetch(
        `*[_type == "logEntry"] | order(coalesce(pinned, false) desc, date desc, _createdAt desc) {
          _id, pinned, date, title, tags, emailSentAt,
          blocks[] {
            _type, _key, text, url, size,
            "imageUrl": image.asset->url, "imageRef": image.asset._ref,
            "audioUrl": audio.asset->url, "audioRef": audio.asset._ref
          }
        }`
      )
      return json(entries)
    }

    // ── POST with ?upload=image or ?upload=audio ─────────────────────────────
    if (req.method === 'POST' && uploadType) {
      const formData = await req.formData()
      const file = formData.get('file')
      if (!file) {
        return json({ error: 'No file in request' }, 400)
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const assetType = uploadType === 'image' ? 'image' : 'file'
      const asset = await sanityClient.assets.upload(assetType, buffer, {
        filename: file.name,
        contentType: file.type,
      })

      return json({ _ref: asset._id, url: asset.url })
    }

    // ── POST: create entry ───────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()
      if (!body.title?.trim()) {
        return json({ error: 'Title is required' }, 400)
      }
      const doc = buildDocument(body)
      const created = await sanityClient.create(doc)
      return json(created, 201)
    }

    // ── PATCH: update entry ──────────────────────────────────────────────────
    if (req.method === 'PATCH') {
      if (!id) return json({ error: 'Missing id' }, 400)
      const body = await req.json()
      if (!body.title?.trim()) {
        return json({ error: 'Title is required' }, 400)
      }
      const patch = {
        pinned: body.pinned ?? false,
        title: body.title,
        tags: body.tags ?? [],
        blocks: buildBlocks(body.blocks),
      }
      if (!body.pinned) patch.date = body.date
      const updated = await sanityClient.patch(id).set(patch).commit()
      return json(updated)
    }

    // ── DELETE: delete entry ─────────────────────────────────────────────────
    if (req.method === 'DELETE' && !url.searchParams.get('subs')) {
      if (!id) return json({ error: 'Missing id' }, 400)
      await sanityClient.delete(id)
      return json({ ok: true })
    }

    // ── GET ?subs=1: list all active subscribers ──────────────────────────────
    if (req.method === 'GET' && url.searchParams.get('subs')) {
      const subscribers = await sanityClient.fetch(
        `*[_type == "subscriber"] | order(subscribedAt desc) { _id, email, status, subscribedAt }`
      )
      return json(subscribers)
    }

    // ── POST ?subs=1: add subscriber ──────────────────────────────────────────
    if (req.method === 'POST' && url.searchParams.get('subs')) {
      const { email } = await req.json()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: 'Invalid email address' }, 400)
      }
      const normalizedEmail = email.toLowerCase().trim()
      const existing = await sanityClient.fetch(
        `*[_type == "subscriber" && email == $email][0]`,
        { email: normalizedEmail }
      )
      if (existing) {
        if (existing.status === 'active') return json({ message: 'Already subscribed' })
        await sanityClient.patch(existing._id).set({ status: 'active' }).commit()
        return json({ message: 'Reactivated' })
      }
      await sanityClient.create({
        _type: 'subscriber',
        email: normalizedEmail,
        subscribedAt: new Date().toISOString(),
        status: 'active',
      })
      return json({ message: 'Added' }, 201)
    }

    // ── DELETE ?subs=1&email=xxx: remove subscriber ───────────────────────────
    if (req.method === 'DELETE' && url.searchParams.get('subs')) {
      const email = url.searchParams.get('email')
      if (!email) return json({ error: 'Missing email' }, 400)
      const subscriber = await sanityClient.fetch(
        `*[_type == "subscriber" && email == $email][0]`,
        { email: email.toLowerCase().trim() }
      )
      if (!subscriber) return json({ error: 'Not found' }, 404)
      await sanityClient.patch(subscriber._id).set({ status: 'inactive', unsubscribedAt: new Date().toISOString() }).commit()
      return json({ ok: true })
    }

    return json({ error: 'Method not allowed' }, 405)

  } catch (err) {
    console.error('entry-write error:', err)
    return json({ error: err.message || 'Something went wrong' }, 500)
  }
}
