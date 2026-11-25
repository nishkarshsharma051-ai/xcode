# Aird — Web File Storage

A lightweight file drop & download site backed by **Vercel Blob** (plus optional static files in `files/`).

## Features
- **Drag & drop or browse** directly on the deployed site to upload files (up to 500 MB per file).
- **Direct download links** and one-click **Copy link** for sharing.
- **Delete** uploaded files directly from the UI.
- **Static fallback**: any files placed inside `files/` are also packaged into `dist/files/` on build.

## Local Development & Deployment
- Build static assets & vendor bundle:
  ```sh
  npm run build
  ```
- Run with Vercel Functions + Blob locally:
  ```sh
  vercel dev
  ```
- Deploy to production:
  ```sh
  vercel --prod
  ```
