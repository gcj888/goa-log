// This is the schema for your Sanity Studio

export default {
  name: 'logEntry',
  title: 'Log Entry',
  type: 'document',
  fields: [
    {
      name: 'pinned',
      title: 'Pinned',
      type: 'boolean',
      description: 'Pin this entry to the top of the feed (no date shown)',
      initialValue: false
    },
    {
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: Rule => Rule.custom((date, context) => {
        if (context.document?.pinned) return true
        return date ? true : 'Date is required for non-pinned entries'
      }),
      initialValue: () => new Date().toISOString().split('T')[0],
      hidden: ({ document }) => document?.pinned
    },
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
      description: 'The main text/title of the entry'
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
      name: 'publishToEmail',
      title: 'Publish to Email',
      type: 'boolean',
      description: 'Include this entry in the RSS feed. Use Send Email button to send directly.',
      initialValue: false
    },
    {
      name: 'emailSentAt',
      title: 'Email Sent At',
      type: 'datetime',
      readOnly: true,
      description: 'Set automatically when email is sent'
    },
    {
      name: 'blocks',
      title: 'Content',
      type: 'array',
      description: 'Add and reorder content blocks',
      of: [
        {
          type: 'object',
          name: 'textBlock',
          title: 'Text',
          fields: [
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              description: 'Markdown supported'
            }
          ],
          preview: {
            select: { text: 'text' },
            prepare({ text }) {
              return {
                title: text?.substring(0, 50) + (text?.length > 50 ? '...' : '') || 'Empty text'
              }
            }
          }
        },
        {
          type: 'object',
          name: 'embedBlock',
          title: 'Embed',
          fields: [
            {
              name: 'url',
              title: 'URL or Embed Code',
              type: 'text',
              description: 'Paste a URL or embed code (YouTube, SoundCloud, Bandcamp, etc.) — embed code will be auto-converted'
            }
          ],
          preview: {
            select: { url: 'url' },
            prepare({ url }) {
              return {
                title: url?.substring(0, 50) + (url?.length > 50 ? '...' : '') || 'Empty embed'
              }
            }
          }
        },
        {
          type: 'object',
          name: 'imageBlock',
          title: 'Image',
          fields: [
            {
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true }
            },
            {
              name: 'size',
              title: 'Size',
              type: 'string',
              options: {
                list: [
                  { title: 'Small (25%)', value: 'small' },
                  { title: 'Medium (50%)', value: 'medium' },
                  { title: 'Large (75%)', value: 'large' },
                  { title: 'Full Width', value: 'full' }
                ],
                layout: 'radio'
              },
              initialValue: 'full'
            }
          ],
          preview: {
            select: { media: 'image', size: 'size' },
            prepare({ media, size }) {
              return {
                title: `Image (${size || 'full'})`,
                media
              }
            }
          }
        },
        {
          type: 'object',
          name: 'audioBlock',
          title: 'Audio',
          fields: [
            {
              name: 'audio',
              title: 'Audio File',
              type: 'file',
              options: { accept: 'audio/*' }
            }
          ],
          preview: {
            prepare() {
              return { title: 'Audio' }
            }
          }
        }
      ]
    },
    // Legacy fields for backwards compatibility
    {
      name: 'image',
      title: 'Image (Legacy)',
      type: 'image',
      options: { hotspot: true },
      hidden: true
    },
    {
      name: 'audio',
      title: 'Audio (Legacy)',
      type: 'file',
      options: { accept: 'audio/*' },
      hidden: true
    },
    {
      name: 'embedUrl',
      title: 'Embed (Legacy)',
      type: 'text',
      hidden: true
    },
    {
      name: 'content',
      title: 'Notes (Legacy)',
      type: 'text',
      hidden: true
    }
  ],
  preview: {
    select: {
      title: 'title',
      date: 'date',
      pinned: 'pinned',
      blocks: 'blocks'
    },
    prepare(selection) {
      const { title, date, pinned, blocks } = selection
      const imageBlock = blocks?.find(b => b._type === 'imageBlock')
      return {
        title: title,
        subtitle: pinned ? '📌 Pinned' : date,
        media: imageBlock?.image
      }
    }
  }
}
