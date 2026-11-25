import { upload } from './vendor/blob-client.js';

const fileInput = document.getElementById('file-input');
const folderInput = document.getElementById('folder-input');
const dropzone = document.getElementById('dropzone');
const dropzoneTitle = document.getElementById('dropzone-title');
const uploadProgressWrap = document.getElementById('upload-progress-wrap');
const uploadProgressLabel = document.getElementById('upload-progress-label');
const uploadProgressPct = document.getElementById('upload-progress-pct');
const uploadProgressBar = document.getElementById('upload-progress');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const filesBody = document.getElementById('files-body');
const statCount = document.getElementById('stat-count');
const statSize = document.getElementById('stat-size');
const statusBanner = document.getElementById('status-banner');
const buildTimeEl = document.getElementById('build-time');

const DEFAULT_DROPZONE_TITLE = 'Drag and drop files or folders here';
const MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024;
const IGNORED_SYSTEM_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

let allFiles = [];
let isUploading = false;
let dragDepth = 0;

/**
 * Formats byte counts into human-readable units.
 * @param {number} bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${numberFormatter.format(value)} ${units[exponent]}`;
}

/**
 * Sorts a copy of files according to the active sort selector.
 * @param {Array} files
 * @param {string} sortKey
 */
function sortFiles(files, sortKey) {
  switch (sortKey) {
    case 'name-desc':
      return files.toSorted((a, b) =>
        b.path.localeCompare(a.path, undefined, { numeric: true, sensitivity: 'base' }),
      );
    case 'size-desc':
      return files.toSorted((a, b) => b.size - a.size);
    case 'size-asc':
      return files.toSorted((a, b) => a.size - b.size);
    case 'date-desc':
      return files.toSorted((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
    case 'name-asc':
    default:
      return files.toSorted((a, b) =>
        a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }),
      );
  }
}

function updateSummaryStats() {
  const totalBytes = allFiles.reduce((sum, f) => sum + (f.size ?? 0), 0);
  statCount.textContent = String(allFiles.length);
  statSize.textContent = formatBytes(totalBytes);
}

/**
 * Builds a table row element for a single file entry without HTML string interpolation.
 * @param {object} file
 */
function createFileRow(file) {
  const row = document.createElement('tr');
  const downloadHref = file.downloadUrl ?? file.url;

  const nameCell = document.createElement('th');
  nameCell.scope = 'row';

  const openLink = document.createElement('a');
  openLink.href = file.url;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.className = 'file-link';
  openLink.textContent = file.name;
  nameCell.append(openLink);

  if (file.path !== file.name) {
    const subpath = document.createElement('span');
    subpath.className = 'file-subpath';
    subpath.textContent = file.path;
    nameCell.append(subpath);
  }

  const typeCell = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = 'type-badge';
  badge.textContent = file.ext;
  typeCell.append(badge);

  const sizeCell = document.createElement('td');
  sizeCell.textContent = formatBytes(file.size);

  const dateCell = document.createElement('td');
  const timeEl = document.createElement('time');
  timeEl.dateTime = file.modifiedAt;
  timeEl.textContent = dateFormatter.format(new Date(file.modifiedAt));
  dateCell.append(timeEl);

  const actionsCell = document.createElement('td');
  actionsCell.className = 'actions-cell';

  const actionGroup = document.createElement('div');
  actionGroup.className = 'action-group';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn';
  copyBtn.textContent = 'Copy link';
  copyBtn.setAttribute('aria-label', `Copy direct download link for ${file.name}`);
  copyBtn.addEventListener('click', async () => {
    const absoluteUrl = new URL(downloadHref, window.location.href).href;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('btn-copied');
      statusBanner.textContent = `Copied download link for ${file.name}.`;
      setTimeout(() => {
        copyBtn.textContent = 'Copy link';
        copyBtn.classList.remove('btn-copied');
      }, 2000);
    } catch {
      statusBanner.textContent = `Direct URL: ${absoluteUrl}`;
    }
  });

  const downloadLink = document.createElement('a');
  downloadLink.href = downloadHref;
  downloadLink.download = file.name;
  downloadLink.className = 'btn btn-primary';
  downloadLink.textContent = 'Download';
  downloadLink.setAttribute('aria-label', `Download ${file.name}`);

  actionGroup.append(copyBtn, downloadLink);

  if (file.source === 'blob') {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete ${file.name}`);
    deleteBtn.addEventListener('click', () => handleDelete(file, deleteBtn));
    actionGroup.append(deleteBtn);
  }

  actionsCell.append(actionGroup);
  row.append(nameCell, typeCell, sizeCell, dateCell, actionsCell);
  return row;
}

function renderEmptyRow(message) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 5;
  cell.className = 'empty-cell';
  cell.textContent = message;
  row.append(cell);
  filesBody.replaceChildren(row);
}

function renderFiles(announce = true) {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query
    ? allFiles.filter(
        (file) =>
          file.path.toLowerCase().includes(query) || file.ext.toLowerCase().includes(query),
      )
    : allFiles;

  const sorted = sortFiles(filtered, sortSelect.value);

  if (allFiles.length === 0) {
    renderEmptyRow('No files stored yet. Drag and drop a file above to upload it.');
    if (announce) statusBanner.textContent = '';
    return;
  }

  if (sorted.length === 0) {
    renderEmptyRow(`No files match "${searchInput.value.trim()}".`);
    if (announce) statusBanner.textContent = `0 of ${allFiles.length} file(s) shown.`;
    return;
  }

  const rows = sorted.map(createFileRow);
  filesBody.replaceChildren(...rows);
  if (announce) {
    statusBanner.textContent = query
      ? `Showing ${sorted.length} of ${allFiles.length} file(s).`
      : `${allFiles.length} file(s) ready to download.`;
  }
}

async function fetchJsonOptional(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function loadFiles(announce = true) {
  const [blobData, manifestData] = await Promise.all([
    fetchJsonOptional('/api/files'),
    fetchJsonOptional('./manifest.json'),
  ]);

  const blobFiles = Array.isArray(blobData?.blobs) ? blobData.blobs : [];
  const staticFiles = Array.isArray(manifestData?.files) ? manifestData.files : [];

  allFiles = [...blobFiles, ...staticFiles];
  updateSummaryStats();

  if (manifestData?.generatedAt) {
    buildTimeEl.textContent = `Site updated ${dateFormatter.format(new Date(manifestData.generatedAt))}`;
  }

  renderFiles(announce);
}

async function handleDelete(file, button) {
  button.disabled = true;
  button.textContent = 'Deleting…';

  try {
    const deleteUrl = new URL('/api/files', window.location.origin);
    deleteUrl.searchParams.set('url', file.url);
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? `HTTP ${response.status}`);
    }

    await loadFiles(false);
    statusBanner.textContent = `Deleted ${file.name}.`;
  } catch (err) {
    button.disabled = false;
    button.textContent = 'Delete';
    statusBanner.textContent =
      err instanceof Error ? `Delete failed: ${err.message}` : 'Failed to delete file.';
  }
}

function readDirectoryBatch(reader) {
  return new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });
}

function readEntryFile(entry) {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function collectEntryFiles(entry) {
  if (entry.isFile) {
    const file = await readEntryFile(entry);
    const relativePath = entry.fullPath.replace(/^\/+/, '') || file.name;
    return [{ file, path: relativePath }];
  }

  if (entry.isDirectory) {
    const reader = entry.createReader();
    const collected = [];
    while (true) {
      const batch = await readDirectoryBatch(reader);
      if (batch.length === 0) break;
      for (const child of batch) {
        collected.push(...(await collectEntryFiles(child)));
      }
    }
    return collected;
  }

  return [];
}

function toUploadQueue(items) {
  return items.filter(({ file }) => !IGNORED_SYSTEM_FILES.has(file.name));
}

async function uploadFiles(rawItems) {
  const queue = toUploadQueue(rawItems);
  if (queue.length === 0) {
    statusBanner.textContent = 'No uploadable files found in selection.';
    return;
  }
  if (isUploading) return;

  isUploading = true;
  uploadProgressWrap.hidden = false;

  let uploadedCount = 0;

  try {
    for (let index = 0; index < queue.length; index += 1) {
      const { file, path } = queue[index];
      uploadProgressLabel.textContent = `Uploading (${index + 1}/${queue.length}): ${path}`;
      uploadProgressBar.value = 0;
      uploadProgressPct.textContent = '0%';

      await upload(path, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        multipart: file.size > MULTIPART_THRESHOLD_BYTES,
        onUploadProgress: ({ percentage }) => {
          const rounded = Math.round(percentage);
          uploadProgressBar.value = rounded;
          uploadProgressPct.textContent = `${rounded}%`;
        },
      });

      uploadedCount += 1;
    }

    await loadFiles(false);
    statusBanner.textContent =
      uploadedCount === 1
        ? `Uploaded ${queue[0].path}. Ready to download or copy link.`
        : `Uploaded ${uploadedCount} files. Ready to download or copy links.`;
  } catch (err) {
    statusBanner.textContent =
      err instanceof Error ? `Upload failed: ${err.message}` : 'Upload failed.';
  } finally {
    isUploading = false;
    uploadProgressWrap.hidden = true;
    fileInput.value = '';
    folderInput.value = '';
  }
}

function setDragActive(active) {
  dropzone.dataset.dragActive = active ? 'true' : 'false';
  dropzoneTitle.textContent = active ? 'Release to upload files or folders' : DEFAULT_DROPZONE_TITLE;
}

dropzone.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dragDepth += 1;
  setDragActive(true);
});

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
});

dropzone.addEventListener('dragleave', (event) => {
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    setDragActive(false);
  }
});

dropzone.addEventListener('drop', async (event) => {
  event.preventDefault();
  dragDepth = 0;
  setDragActive(false);

  // Extract DataTransfer entries synchronously before any await clears DataTransfer
  const entries = [...(event.dataTransfer?.items ?? [])]
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean);
  const fallbackFiles = [...(event.dataTransfer?.files ?? [])];

  if (entries.length > 0) {
    statusBanner.textContent = 'Scanning dropped files and folders…';
    try {
      const nested = await Promise.all(entries.map(collectEntryFiles));
      await uploadFiles(nested.flat());
      return;
    } catch (err) {
      statusBanner.textContent =
        err instanceof Error ? `Could not read folder: ${err.message}` : 'Could not read folder.';
      return;
    }
  }

  if (fallbackFiles.length > 0) {
    await uploadFiles(
      fallbackFiles.map((file) => ({ file, path: file.webkitRelativePath || file.name })),
    );
  }
});

// Prevent browser from navigating away if a file is dropped slightly outside the dropzone
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());

fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) {
    uploadFiles(
      [...fileInput.files].map((file) => ({ file, path: file.webkitRelativePath || file.name })),
    );
  }
});

folderInput.addEventListener('change', () => {
  if (folderInput.files?.length) {
    uploadFiles(
      [...folderInput.files].map((file) => ({ file, path: file.webkitRelativePath || file.name })),
    );
  }
});

searchInput.addEventListener('input', () => renderFiles(true));
sortSelect.addEventListener('change', () => renderFiles(true));

loadFiles(true);
