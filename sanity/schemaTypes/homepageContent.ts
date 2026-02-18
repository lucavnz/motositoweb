import { defineType, defineField } from 'sanity'

const imageField = (name: string, title: string) =>
    defineField({
        name,
        title,
        type: 'image',
        options: { hotspot: true },
        fields: [
            {
                name: 'alt',
                title: 'Testo alternativo',
                type: 'string',
            },
        ],
    })

export default defineType({
    name: 'homepageContent',
    title: 'Contenuti Homepage',
    type: 'document',
    groups: [
        { name: 'hero', title: 'Hero' },
        { name: 'featured', title: 'Sezione Featured (4 Blocchi)' },
        { name: 'cta', title: 'Call to Action' },
    ],
    fields: [
        // ── Hero ──
        imageField('heroImage', 'Immagine Hero'),
        defineField({
            name: 'heroTitle',
            title: 'Titolo Hero',
            type: 'string',
            group: 'hero',
        }),
        defineField({
            name: 'heroSubtitle',
            title: 'Sottotitolo Hero',
            type: 'string',
            group: 'hero',
        }),

        // ── Featured Block 1 ──
        defineField({
            name: 'featuredBlock1Title',
            title: 'Blocco 1 — Titolo',
            type: 'string',
            group: 'featured',
        }),
        defineField({
            name: 'featuredBlock1Description',
            title: 'Blocco 1 — Descrizione',
            type: 'text',
            rows: 3,
            group: 'featured',
        }),
        imageField('featuredBlock1Image', 'Blocco 1 — Immagine'),

        // ── Featured Block 2 ──
        defineField({
            name: 'featuredBlock2Title',
            title: 'Blocco 2 — Titolo',
            type: 'string',
            group: 'featured',
        }),
        defineField({
            name: 'featuredBlock2Description',
            title: 'Blocco 2 — Descrizione',
            type: 'text',
            rows: 3,
            group: 'featured',
        }),
        imageField('featuredBlock2Image', 'Blocco 2 — Immagine'),

        // ── Featured Block 3 ──
        defineField({
            name: 'featuredBlock3Title',
            title: 'Blocco 3 — Titolo',
            type: 'string',
            group: 'featured',
        }),
        defineField({
            name: 'featuredBlock3Description',
            title: 'Blocco 3 — Descrizione',
            type: 'text',
            rows: 3,
            group: 'featured',
        }),
        imageField('featuredBlock3Image', 'Blocco 3 — Immagine'),

        // ── Featured Block 4 ──
        defineField({
            name: 'featuredBlock4Title',
            title: 'Blocco 4 — Titolo',
            type: 'string',
            group: 'featured',
        }),
        defineField({
            name: 'featuredBlock4Description',
            title: 'Blocco 4 — Descrizione',
            type: 'text',
            rows: 3,
            group: 'featured',
        }),
        // featuredBlock4Image removed — no longer used in layout

        // ── Legacy featured (backward compat) ──
        defineField({
            name: 'featuredTitle',
            title: '(Legacy) Titolo Sezione In Evidenza',
            type: 'string',
            hidden: true,
        }),
        defineField({
            name: 'featuredDescription',
            title: '(Legacy) Descrizione Sezione In Evidenza',
            type: 'text',
            rows: 3,
            hidden: true,
        }),

        // ── CTA ──
        defineField({
            name: 'ctaTitle',
            title: 'Titolo CTA',
            type: 'string',
            group: 'cta',
        }),
        defineField({
            name: 'ctaSubtitle',
            title: 'Sottotitolo CTA',
            type: 'string',
            group: 'cta',
        }),
        // ctaImage removed — CTA section no longer uses a background image
    ],
    preview: {
        prepare() {
            return {
                title: 'Contenuti Homepage',
            }
        },
    },
})
