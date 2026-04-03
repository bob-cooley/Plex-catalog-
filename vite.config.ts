import { defineConfig, Plugin } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

// jsPDF bundles a CDN reference to pdfobject for its dataurlnewwindow output
// method, which IndexMyPlex does not use. Strip it at build time to satisfy
// Chrome Web Store's no-remote-code requirement for Manifest V3.
function stripPdfObjectCdn(): Plugin {
  return {
    name: 'strip-pdfobject-cdn',
    transform(code, id) {
      if (id.includes('jspdf') && code.includes('cdnjs.cloudflare.com')) {
        return code.replace(
          'https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js',
          ''
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [stripPdfObjectCdn(), crx({ manifest })],
  build: {
    outDir: 'dist',
  },
})
