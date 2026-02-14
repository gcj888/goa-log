/**
 * subscribe.mjs — Netlify Function
 *
 * Handles email signups from the site header form.
 * POST { email } → creates subscriber in Sanity, sends welcome email via Resend.
 */

import { createClient } from '@sanity/client'
import { Resend } from 'resend'

const sanityClient = createClient({
  projectId: 'vxhzzkqz',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
})

const resend = new Resend(process.env.RESEND_API_KEY)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { email } = await req.json()

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check for duplicate
    const existing = await sanityClient.fetch(
      `*[_type == "subscriber" && email == $email][0]`,
      { email: normalizedEmail }
    )

    if (existing) {
      if (existing.status === 'active') {
        return new Response(JSON.stringify({ message: 'Already subscribed' }), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }
      // Reactivate unsubscribed user
      await sanityClient.patch(existing._id).set({ status: 'active' }).commit()
    } else {
      // Create new subscriber
      await sanityClient.create({
        _type: 'subscriber',
        email: normalizedEmail,
        subscribedAt: new Date().toISOString(),
        status: 'active',
      })
    }

    // Send welcome email
    try {
      await resend.emails.send({
        from: 'cabbages.info <hello@cabbages.info>',
        to: normalizedEmail,
        subject: 'Welcome to cabbages.info',
        html: `<!DOCTYPE html>
<html><head>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 14px; line-height: 1.5;">
<div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
  <div style="margin-bottom: 24px; border-bottom: 1px solid #000000; padding-bottom: 16px;">
    <div style="font-size: 15px;">You're subscribed to cabbages.info</div>
  </div>
  <p>You'll get occasional emails when new things are posted. Nothing frequent, nothing spammy.</p>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #000000; font-size: 12px;">
    <a href="https://cabbages.info" style="color: #000000;">cabbages.info</a>
  </div>
</div>
</body></html>`,
      })
    } catch (emailErr) {
      // Don't fail the subscription if welcome email fails
      console.error('Welcome email failed:', emailErr)
    }

    return new Response(JSON.stringify({ message: 'Subscribed' }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Subscribe error:', err)
    return new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
}
