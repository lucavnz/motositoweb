import imageUrlBuilder from '@sanity/image-url'
import { client } from './sanity.client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SanityImageSource = any

const builder = imageUrlBuilder(client)

export function urlFor(source: SanityImageSource) {
    return builder.image(source)
}
