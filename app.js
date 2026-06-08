const API_URL = 'https://script.google.com/macros/s/AKfycbzoWQU-_CScGngtIuoLgUDGQj_7QHScqYXMlfFeXTjg3CL7Q9SextT947ayvOwRWB0Q/exec';
const POST_URL = 'https://script.google.com/macros/s/AKfycbzBcqnU-Phr7WAkZduhgrelpt-tAVZ_gEEThNW-Maf5th3lJFmOM_vJu3hK1NlpgpRC/exec';

let deferredPrompt = null;
let availableGigs = [];
let confirmingDeleteDate = null;
let confirmDeleteTimer = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

function isMobile() {
  return window.matchMedia('(max-width: 768px)').matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function setupInstallPrompt() {
  if (isStandalone() || !isMobile()) return;

  const btn = document.getElementById('install-btn');
  if (!btn) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.hidden = false;
  });

  btn.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
      btn.hidden = true;
    } else if (isIOS()) {
      btn.hidden = true;
      alert('To add to your home screen: tap the Share button at the bottom, then choose “Add to Home Screen”.');
    }
  });

  if (isIOS()) btn.hidden = false;
}

setupInstallPrompt();

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function parseGigDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function sortByDate(gigs) {
  return [...gigs].sort((a, b) => {
    const da = parseGigDate(a.date)?.getTime() ?? 0;
    const db = parseGigDate(b.date)?.getTime() ?? 0;
    return da - db;
  });
}

function isTbc(fee) {
  return fee && (fee.toLowerCase().includes('tbc') || fee.toLowerCase().includes('ticket'));
}

function formatFee(fee) {
  if (!fee) return '';
  if (isTbc(fee)) return `Fee: ${fee}`;
  const num = parseFloat(String(fee).replace(/[^0-9.]/g, ''));
  if (!isNaN(num)) {
    return `Fee: £${num % 1 === 0 ? num : num.toFixed(2)}`;
  }
  return `Fee: ${fee}`;
}

function buildBookedTable(gigs) {
  const table = document.createElement('table');
  table.className = 'gig-grid';
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Venue</th>
        <th scope="col">Town</th>
        <th scope="col">Fee</th>
        <th scope="col">Notes</th>
        <th scope="col">Comms</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  gigs.forEach(g => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(g.date)}</td>
      <td>${g.venue ?? ''}</td>
      <td>${g.town ?? ''}</td>
      <td>${g.fee ? formatFee(g.fee) : ''}</td>
      <td>${g.notes ?? ''}</td>
      <td>${g.comms ?? ''}</td>
    `;
    tbody.appendChild(row);
  });
  return table;
}

function resetDeleteConfirm() {
  confirmingDeleteDate = null;
  clearTimeout(confirmDeleteTimer);
  confirmDeleteTimer = null;
  document.querySelectorAll('.delete-date-btn.is-confirming').forEach(btn => {
    btn.classList.remove('is-confirming');
    btn.textContent = 'Delete date';
    btn.setAttribute('aria-label', `Delete ${btn.dataset.date}`);
  });
}

function buildAvailablePanel(gigs) {
  const fragment = document.createDocumentFragment();
  availableGigs = sortByDate(gigs);

  const toolbar = document.createElement('div');
  toolbar.className = 'available-toolbar';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'panel-btn';
  copyBtn.textContent = 'Copy all dates';
  copyBtn.addEventListener('click', copyAvailableDates);
  toolbar.appendChild(copyBtn);

  const list = document.createElement('ul');
  list.className = 'available-list';

  availableGigs.forEach(g => {
    const item = document.createElement('li');
    item.className = 'available-item';

    const dateEl = document.createElement('span');
    dateEl.className = 'available-date';
    dateEl.textContent = formatDate(g.date);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-date-btn';
    deleteBtn.dataset.date = g.date;
    deleteBtn.textContent = 'Delete date';
    deleteBtn.setAttribute('aria-label', `Delete ${g.date}`);
    deleteBtn.addEventListener('click', () => handleDeleteClick(g.date, deleteBtn));

    item.append(dateEl, deleteBtn);
    list.appendChild(item);
  });

  fragment.append(toolbar, list);
  return fragment;
}

function handleDeleteClick(date, btn) {
  if (confirmingDeleteDate !== date) {
    resetDeleteConfirm();
    confirmingDeleteDate = date;
    btn.classList.add('is-confirming');
    btn.textContent = 'Confirm delete?';
    btn.setAttribute('aria-label', `Confirm delete ${date}`);
    confirmDeleteTimer = setTimeout(resetDeleteConfirm, 5000);
    return;
  }

  resetDeleteConfirm();
  deleteAvailableDate(date, btn);
}

async function deleteAvailableDate(date, btn) {
  btn.disabled = true;
  btn.textContent = 'Deleting…';

  try {
    const body = new URLSearchParams({ action: 'delete', date });
    const res = await fetch(POST_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Delete is not available yet. Add the handler in Apps Script and redeploy.');
    }

    if (!data.success) {
      throw new Error(data.error || 'Could not delete that date.');
    }

    await loadGigs();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Delete date';
    alert(err.message || 'Could not delete that date. Please try again.');
  }
}

async function copyAvailableDates() {
  if (availableGigs.length === 0) return;

  const text = availableGigs
    .map(g => formatDate(g.date))
    .join('\n');

  try {
    await navigator.clipboard.writeText(text);
    const btn = document.querySelector('.available-toolbar .panel-btn');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    }
  } catch {
    window.prompt('Copy these dates:', text);
  }
}

async function loadGigs() {
  const bookedList = document.getElementById('list-booked');
  const availableList = document.getElementById('list-available');
  bookedList.innerHTML = '<div class="loading">Loading…</div>';
  availableList.innerHTML = '<div class="loading">Loading…</div>';
  resetDeleteConfirm();

  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const booked = data.gigs.filter(g => g.booked);
    const available = data.gigs.filter(g => !g.booked);

    document.getElementById('count-booked').textContent = booked.length;
    document.getElementById('count-available').textContent = available.length;

    bookedList.innerHTML = '';
    availableList.innerHTML = '';

    if (booked.length === 0) {
      bookedList.innerHTML = '<p class="error">No booked gigs yet.</p>';
    } else {
      bookedList.appendChild(buildBookedTable(booked));
    }

    if (available.length === 0) {
      availableList.innerHTML = '<p class="error">No available dates.</p>';
    } else {
      availableList.appendChild(buildAvailablePanel(available));
    }

    const updated = new Date(data.updated).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById('footer').textContent =
      `Ey Up Maiden · Last updated ${updated}`;
  } catch {
    const msg = '<div class="error">Could not load gig data. Please try again.</div>';
    bookedList.innerHTML = msg;
    availableList.innerHTML = msg;
  }
}

loadGigs();
