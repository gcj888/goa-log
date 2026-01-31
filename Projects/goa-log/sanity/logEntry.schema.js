// This is the schema for your Sanity Studio
// Copy this into your Sanity project schemas folder

export default {
  name: 'logEntry',
  title: 'Log Entry',
  type: 'document',
  fields: [
    {
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: Rule => Rule.required(),
      initialValue: () => new Date().toISOString().split('T')[0]
    },
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
      description: 'The main text/title of the entry (shown when collapsed)'
    },
    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags'
      },
      description: 'Add tags like: release, sketch, idea, music, etc.'
    },
    {
      name: 'mediaType',
      title: 'Media Type',
      type: 'string',
      options: {
        list: [
          { title: 'Text Only', value: 'text' },
          { title: 'Image', value: 'image' },
          { title: 'Audio', value: 'audio' },
          { title: 'Audio + Image', value: 'audioImage' },
          { title: 'Embed (YouTube, SoundCloud, Bandcamp)', value: 'embed' }
        ]
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'content',
      title: 'Content',
      type: 'text',
      description: 'Additional text content (shown when expanded)',
      hidden: ({ document }) => document?.mediaType === 'embed'
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true
      },
      hidden: ({ document }) => !['image', 'audioImage'].includes(document?.mediaType)
    },
    {
      name: 'audio',
      title: 'Audio File',
      type: 'file',
      options: {
        accept: 'audio/*'
      },
      hidden: ({ document }) => !['audio', 'audioImage'].includes(document?.mediaType)
    },
    {
      name: 'embedUrl',
      title: 'Embed URL',
      type: 'url',
      description: 'YouTube, SoundCloud, or Bandcamp URL',
      hidden: ({ document }) => document?.mediaType !== 'embed',
      validation: Rule => Rule.custom((url, context) => {
        if (context.document?.mediaType === 'embed' && !url) {
          return 'Embed URL is required when media type is embed'
        }
        return true
      })
    }
  ],
  preview: {
    select: {
      title: 'title',
      date: 'date',
      media: 'image'
    },
    prepare(selection) {
      const { title, date } = selection
      return {
        title: title,
        subtitle: date
      }
    }
  }
}
