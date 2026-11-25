const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const filesBody = document.getElementById('files-body');
const statCount = document.getElementById('stat-count');
const statSize = document.getElementById('stat-size');
const statusBanner = document.getElementById('status-banner');
const buildTimeEl = document.getElementById('build-time');

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

let allFiles = [];

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

/**
 * Builds a table row element for a single file entry without HTML string interpolation.
 * @param {object} file
 */
function createFileRow(file) {
  const row = document.createElement('tr');

  const nameCell = document.createElement('th');
  nameCell.scope = 'row';

  const openLink = document.createElement('a');
  openLink.href = file.url;
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
    const absoluteUrl = new URL(file.url, window.location.href).href;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      copyBtn.textContent = 'Copied';
      copyBtn.classList.add('btn-copied');
      statusBanner.textContent = `Copied link for ${file.name}.`;
      setTimeout(() => {
        copyBtn.textContent = 'Copy link';
        copyBtn.classList.remove('btn-copied');
      }, 2000);
    } catch {
      statusBanner.textContent = `Direct URL: ${absoluteUrl}`;
    }
  });

  const downloadLink = document.createElement('a');
  downloadLink.href = file.url;
  downloadLink.download = file.name;
  downloadLink.className = 'btn btn-primary';
  downloadLink.textContent = 'Download';
  downloadLink.setAttribute('aria-label', `Download ${file.name}`);

  actionGroup.append(copyBtn, downloadLink);
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

function renderFiles() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query
    ? allFiles.filter(
        (file) =>
          file.path.toLowerCase().includes(query) || file.ext.toLowerCase().includes(query),
      )
    : allFiles;

  const sorted = sortFiles(filtered, sortSelect.value);

  if (allFiles.length === 0) {
    renderEmptyRow('No files uploaded yet. Add files to the files/ folder and redeploy.');
    statusBanner.textContent = '';
    return;
  }

  if (sorted.length === 0) {
    renderEmptyRow(`No files match "${searchInput.value.trim()}".`);
    statusBanner.textContent = `0 of ${allFiles.length} file(s) shown.`;
    return;
  }

  const rows = sorted.map(createFileRow);
  filesBody.replaceChildren(...rows);
  statusBanner.textContent = query
    ? `Showing ${sorted.length} of ${allFiles.length} file(s).`
    : `${allFiles.length} file(s) ready to download.`;
}

async function init() {
  try {
    const response = await fetch('./manifest.json', {
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading manifest.json`);
    }

    const manifest = await response.json();
    allFiles = Array.isArray(manifest.files) ? manifest.files : [];

    statCount.textContent = String(manifest.totalFiles ?? allFiles.length);
    statSize.textContent = formatBytes(manifest.totalBytes ?? 0);

    if (manifest.generatedAt) {
      buildTimeEl.textContent = `Updated ${dateFormatter.format(new Date(manifest.generatedAt))}`;
    }

    renderFiles();
  } catch (err) {
    renderEmptyRow('Could not load the file list.');
    statusBanner.textContent =
      err instanceof Error ? `Error: ${err.message}` : 'Failed to load manifest.';
  }
}

searchInput.addEventListener('input', renderFiles);
sortSelect.addEventListener('change', renderFiles);

init();

