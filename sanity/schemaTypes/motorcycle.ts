import { defineType, defineField } from 'sanity'

export default defineType({
    name: 'motorcycle',
    title: 'Moto',
    type: 'document',
    fields: [
        defineField({
            name: 'model',
            title: 'Modello',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: {
                source: 'model',
                maxLength: 96,
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'brand',
            title: 'Marchio',
            type: 'reference',
            to: [{ type: 'brand' }],
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'year',
            title: 'Anno',
            type: 'number',
            validation: (Rule) => Rule.required().min(1900).max(2100),
        }),
        defineField({
            name: 'type',
            title: 'Tipo',
            type: 'string',
            options: {
                list: [
                    { title: 'Strada', value: 'strada' },
                    { title: 'Enduro', value: 'enduro' },
                    { title: 'Cross', value: 'cross' },
                    { title: 'Scooter', value: 'scooter' },
                ],
                layout: 'radio',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'condition',
            title: 'Condizione',
            type: 'string',
            options: {
                list: [
                    { title: 'Nuova', value: 'nuova' },
                    { title: 'Usata', value: 'usata' },
                ],
                layout: 'radio',
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'price',
            title: 'Prezzo (€)',
            type: 'number',
        }),
        defineField({
            name: 'kilometers',
            title: 'Chilometri',
            type: 'number',
            description: 'Solo per moto usate',
            hidden: ({ document }) => document?.condition !== 'usata',
        }),
        defineField({
            name: 'shortDescription',
            title: 'Descrizione Breve',
            type: 'text',
            rows: 3,
        }),
        defineField({
            name: 'longDescription',
            title: 'Descrizione Lunga',
            type: 'array',
            of: [{ type: 'block' }],
        }),
        defineField({
            name: 'images',
            title: 'Immagini (max 4)',
            type: 'array',
            of: [
                {
                    type: 'image',
                    options: { hotspot: true },
                    fields: [
                        {
                            name: 'alt',
                            title: 'Testo alternativo',
                            type: 'string',
                        },
                    ],
                },
            ],
            validation: (Rule) => Rule.max(4),
        }),
    ],
    preview: {
        select: {
            title: 'model',
            subtitle: 'brand.name',
            media: 'images.0',
        },
        prepare({ title, subtitle, media }) {
            return {
                title,
                subtitle: subtitle || '',
                media,
            }
        },
    },
    orderings: [
        {
            title: 'Modello A-Z',
            name: 'modelAsc',
            by: [{ field: 'model', direction: 'asc' }],
        },
        {
            title: 'Anno Recente',
            name: 'yearDesc',
            by: [{ field: 'year', direction: 'desc' }],
        },
    ],
})
