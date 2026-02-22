import { defineType, defineField } from 'sanity'

export default defineType({
    name: 'brand',
    title: 'Marchio',
    type: 'document',
    fields: [
        defineField({
            name: 'name',
            title: 'Nome Marchio',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'slug',
            title: 'Slug',
            type: 'slug',
            options: {
                source: 'name',
                maxLength: 96,
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'logo',
            title: 'Logo',
            type: 'image',
            options: {
                hotspot: true,
            },
            fields: [
                {
                    name: 'alt',
                    title: 'Testo alternativo',
                    type: 'string',
                }
            ]
        }),
        defineField({
            name: 'order',
            title: 'Ordinamento',
            type: 'number',
            description: 'Ordine di visualizzazione nel menu (più basso = prima)',
        }),
    ],
    orderings: [
        {
            title: 'Ordinamento',
            name: 'orderAsc',
            by: [{ field: 'order', direction: 'asc' }],
        },
    ],
    preview: {
        select: {
            title: 'name',
            media: 'logo',
        },
    },
})
