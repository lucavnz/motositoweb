'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './sanity/schemaTypes'
import { generateDescriptionAction } from './sanity/actions/generateDescriptionAction'

export default defineConfig({
  name: 'avanzi-moto',
  title: 'Avanzi Moto',
  projectId: '9r9hyqn3',
  dataset: 'production',
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'motorcycle') {
        return [generateDescriptionAction, ...prev]
      }
      return prev
    },
  },
  basePath: '/studio',
})
