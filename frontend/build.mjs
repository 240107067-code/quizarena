// Bundles src/main.tsx into dist/ with esbuild. API=mock|http selects the service layer.
import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

const api = process.env.API || 'mock';
mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('src/styles.css', 'dist/styles.css');
await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  outfile: 'dist/app.js',
  jsx: 'automatic',
  define: { __API__: JSON.stringify(api), 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});
console.log(`built dist/ with API=${api}`);
