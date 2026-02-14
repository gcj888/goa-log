import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {sendEmailAction} from './actions/sendEmailAction'

export default defineConfig({
  name: 'default',
  title: 'goa-log-cms',

  projectId: 'vxhzzkqz',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'logEntry') {
        return [...prev, sendEmailAction]
      }
      return prev
    },
  },
})
