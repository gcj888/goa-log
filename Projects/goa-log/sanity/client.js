import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: 'vxhzzkqz', // You'll get this when you set up Sanity
  dataset: 'production',
  useCdn: true, // Set to false for dev if you need fresh data
  apiVersion: '2024-01-01',
})

// Query helper
export const getEntries = async () => {
  return await sanityClient.fetch(
    `*[_type == "logEntry"] | order(date desc, _createdAt desc) {
      _id,
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
    }`
  )
}
