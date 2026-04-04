import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prerender from '@prerenderer/rollup-plugin'
import JSDOMRenderer from '@prerenderer/renderer-jsdom'

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
      renderer: new JSDOMRenderer()
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
})
