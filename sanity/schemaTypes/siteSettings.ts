import { defineType, defineField } from 'sanity'

export default defineType({
    name: 'siteSettings',
    title: 'Impostazioni Sito',
    type: 'document',
    fields: [
        defineField({
            name: 'siteName',
            title: 'Nome Sito',
            type: 'string',
        }),
        defineField({
            name: 'description',
            title: 'Descrizione (Meta)',
            type: 'text',
            rows: 3,
        }),
        defineField({
            name: 'phone',
            title: 'Telefono',
            type: 'string',
        }),
        defineField({
            name: 'email',
            title: 'Email',
            type: 'string',
        }),
        defineField({
            name: 'address',
            title: 'Indirizzo',
            type: 'string',
        }),
        defineField({
            name: 'socialLinks',
            title: 'Link Social',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        defineField({
                            name: 'platform',
                            title: 'Piattaforma',
                            type: 'string',
                            options: {
                                list: [
                                    { title: 'Facebook', value: 'facebook' },
                                    { title: 'Instagram', value: 'instagram' },
                                    { title: 'YouTube', value: 'youtube' },
                                    { title: 'TikTok', value: 'tiktok' },
                                ],
                            },
                        }),
                        defineField({
                            name: 'url',
                            title: 'URL',
                            type: 'url',
                        }),
                    ],
                    preview: {
                        select: {
                            title: 'platform',
                            subtitle: 'url',
                        },
                    },
                },
            ],
        }),
    ],
    preview: {
        prepare() {
            return {
                title: 'Impostazioni Sito',
            }
        },
    },
})
