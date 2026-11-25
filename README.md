# Aird — Simple Static Web File Storage

A zero-dependency static file vault deployable to Vercel. Put any files you want to share inside `files/`, deploy, and download them from anywhere via direct links.

## Usage

1. Add or replace files inside `files/` (subfolders work too).
2. Preview locally:
   ```sh
   npm run dev
   ```
3. Deploy to Vercel:
   ```sh
   vercel --prod
   ```
   Vercel automatically runs `npm run build` (`scripts/generate-manifest.mjs`) to package `dist/` and generate `dist/manifest.json` with every file's direct URL, size, and timestamp.

