import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: 'vxhzzkqz', // You'll get this when you set up Sanity
  dataset: 'production',
  useCdn: true, // Set to false for dev if you need fresh data
  apiVersion: '2024-01-01',
})

// Query helper
const entryFields = `
  _id,
  pinned,
  date,
  title,
  tags,
  blocks[] {
    _type,
    _key,
    text,
    url,
    size,
    "imageUrl": image.asset->url,
    "audioUrl": audio.asset->url
  },
  // Legacy fields for backwards compatibility
  content,
  "imageUrl": image.asset->url,
  "audioUrl": audio.asset->url,
  embedUrl
`

export const getEntries = async () => {
  return await sanityClient.fetch(
    `*[_type == "logEntry"] | order(coalesce(pinned, false) desc, date desc, _createdAt desc) {${entryFields}}`
  )
}

export const getLatestEntry = async () => {
  return await sanityClient.fetch(
    `*[_type == "logEntry"] | order(date desc, _createdAt desc) [0] {${entryFields}}`
  )
}

export const getEntryById = async (id) => {
  return await sanityClient.fetch(
    `*[_type == "logEntry" && _id == $id][0] {${entryFields}}`,
    { id }
  )
}

