import { defineType, defineField } from 'sanity'

export default defineType({
    name: 'homepageContent',
    title: 'Contenuti Homepage',
    type: 'document',
    fields: [
        defineField({
            name: 'heroImage',
            title: 'Immagine Hero',
            type: 'image',
            options: { hotspot: true },
            fields: [
                {
                    name: 'alt',
                    title: 'Testo alternativo',
                    type: 'string',
                },
            ],
        }),
        defineField({
            name: 'heroTitle',
            title: 'Titolo Hero',
            type: 'string',
        }),
        defineField({
            name: 'heroSubtitle',
            title: 'Sottotitolo Hero',
            type: 'string',
        }),
        defineField({
            name: 'featuredTitle',
            title: 'Titolo Sezione In Evidenza',
            type: 'string',
        }),
        defineField({
            name: 'featuredImage',
            title: 'Immagine Sezione In Evidenza',
            type: 'image',
            options: { hotspot: true },
            fields: [
                {
                    name: 'alt',
                    title: 'Testo alternativo',
                    type: 'string',
                },
            ],
        }),
        defineField({
            name: 'featuredDescription',
            title: 'Descrizione Sezione In Evidenza',
            type: 'text',
            rows: 3,
        }),
        defineField({
            name: 'ctaTitle',
            title: 'Titolo CTA',
            type: 'string',
        }),
        defineField({
            name: 'ctaSubtitle',
            title: 'Sottotitolo CTA',
            type: 'string',
        }),
        defineField({
            name: 'ctaImage',
            title: 'Immagine CTA',
            type: 'image',
            options: { hotspot: true },
            fields: [
                {
                    name: 'alt',
                    title: 'Testo alternativo',
                    type: 'string',
                },
            ],
        }),
    ],
    preview: {
        prepare() {
            return {
                title: 'Contenuti Homepage',
            }
        },
    },
})
