import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prerender from '@prerenderer/rollup-plugin'
import PuppeteerRenderer from '@prerenderer/renderer-puppeteer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    prerender({
      routes: [
        '/', 
        '/collections', 
        '/invitation/Hindu', 
        '/invitation/Muslim', 
        '/invitation/Christian', 
        '/latest-arrivals', 
        '/celebration-boutique', 
        '/contact'
      ],
      renderer: new PuppeteerRenderer()
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
})
