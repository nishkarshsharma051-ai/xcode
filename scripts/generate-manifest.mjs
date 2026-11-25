import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const filesDir = path.join(rootDir, 'files');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const distFilesDir = path.join(distDir, 'files');
const distVendorDir = path.join(distDir, 'vendor');

const IGNORED_NAMES = new Set(['.DS_Store', '.gitkeep', 'Thumbs.db']);

/**
 * Recursively collects metadata for every file inside `dir`.
 * @param {string} dir
 * @param {string} relativeBase
 */
async function collectFiles(dir, relativeBase = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...(await collectFiles(fullPath, relPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const info = await stat(fullPath);
    const content = await readFile(fullPath);
    const sha256 = createHash('sha256').update(content).digest('hex').slice(0, 12);
    const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');

    results.push({
      name: entry.name,
      path: relPath,
      url: `./files/${relPath.split('/').map(encodeURIComponent).join('/')}`,
      size: info.size,
      modifiedAt: info.mtime.toISOString(),
      ext: ext || 'file',
      sha256,
      source: 'static',
    });
  }

  return results;
}

async function main() {
  await mkdir(filesDir, { recursive: true });
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distFilesDir, { recursive: true });
  await mkdir(distVendorDir, { recursive: true });

  await cp(srcDir, distDir, { recursive: true });

  await cp(filesDir, distFilesDir, {
    recursive: true,
    filter: (source) => {
      const base = path.basename(source);
      return !IGNORED_NAMES.has(base) && (source === filesDir || !base.startsWith('.'));
    },
  });

  // Bundle @vercel/blob/client for browser direct uploads without a frontend framework bundler
  await build({
    entryPoints: [path.join(rootDir, 'node_modules/@vercel/blob/dist/client.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: true,
    outfile: path.join(distVendorDir, 'blob-client.js'),
  });

  const files = (await collectFiles(filesDir)).toSorted((a, b) =>
    a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }),
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
    totalBytes: files.reduce((sum, f) => sum + f.size, 0),
    files,
  };

  await writeFile(
    path.join(distDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(`Built dist/ with ${manifest.totalFiles} static file(s) (${manifest.totalBytes} bytes).`);
}

main().catch((err) => {
  console.error('Failed to build file manifest:', err);
  process.exitCode = 1;
});
