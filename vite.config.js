import { defineConfig } from 'vite';
export default defineConfig({
  base: '/E-VOTING-OSIS/',
  build: { outDir: 'dist', rollupOptions: { input: { main: 'index.html', vote: 'vote.html', thankyou: 'thankyou.html', admin: 'admin.html' } } },
  test: { exclude: ['tests/e2e/**', 'node_modules/**'] }
});
