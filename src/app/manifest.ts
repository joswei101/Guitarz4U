import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Guitarz4U — second-hand guitars & repairs',
    short_name: 'Guitarz4U',
    description: 'Second-hand guitars, selling and repairs in Sandringham, Johannesburg.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4ECDC',
    theme_color: '#2B1B12',
    lang: 'en-ZA',
    categories: ['shopping', 'music'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
