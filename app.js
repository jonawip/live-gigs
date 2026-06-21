const API_URL = 'https://script.google.com/macros/s/AKfycbzoWQU-_CScGngtIuoLgUDGQj_7QHScqYXMlfFeXTjg3CL7Q9SextT947ayvOwRWB0Q/exec';
const POST_URL = 'https://script.google.com/macros/s/AKfycbzBcqnU-Phr7WAkZduhgrelpt-tAVZ_gEEThNW-Maf5th3lJFmOM_vJu3hK1NlpgpRC/exec';

const SVG_PIN = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z';
const SVG_MONEY = 'M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm.9 16.7v1.3h-1.6v-1.3c-1.6-.2-2.9-1.1-3-2.8h1.7c.1.8.7 1.4 2 1.4 1.2 0 1.7-.6 1.7-1.2 0-.8-.6-1.1-2.2-1.5-1.7-.4-3-1-3-2.7 0-1.3 1-2.2 2.4-2.5V6.8h1.6v1.3c1.5.3 2.4 1.3 2.5 2.6h-1.7c-.1-.7-.6-1.3-1.7-1.3-1 0-1.6.5-1.6 1.1 0 .7.6 1 2.1 1.4 1.8.4 3.1 1.1 3.1 2.8 0 1.4-1 2.3-2.7 2.7Z';
const SVG_COMMS = 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z';
const SVG_TRASH = 'M6 7h12l-1 13H7L6 7Zm9-3 1 1h4v2H4V5h4l1-1h6Z';

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
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.panel').forEach(p => {
      p.classList.remove('active');
      p.hidden = true;
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panel = document.getElementById('panel-' + btn.dataset.tab);
    panel.classList.add('active');
    panel.hidden = false;
  });
});

function createSvg(pathD) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  svg.appendChild(path);
  return svg;
}

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

function dayNum(dateStr) {
  return parseGigDate(dateStr)?.getDate() ?? '';
}

function monShort(dateStr) {
  const d = parseGigDate(dateStr);
  return d ? d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : '';
}

function dowShort(dateStr) {
  const d = parseGigDate(dateStr);
  return d ? d.toLocaleDateString('en-GB', { weekday: 'short' }) : '';
}

function daysAway(dateStr) {
  const d = parseGigDate(dateStr);
  if (!d) return '';
  const today = startOfDay(new Date());
  const gigDay = startOfDay(d);
  const n = Math.round((gigDay - today) / 86400000);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `in ${n} days`;
}

function sortByDate(gigs) {
  return [...gigs].sort((a, b) => {
    const da = parseGigDate(a.date)?.getTime() ?? 0;
    const db = parseGigDate(b.date)?.getTime() ?? 0;
    return da - db;
  });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isPastGig(dateStr) {
  const d = parseGigDate(dateStr);
  if (!d) return false;
  return startOfDay(d) < startOfDay(new Date());
}

function filterUpcomingGigs(gigs) {
  return sortByDate(gigs.filter(g => !isPastGig(g.date)));
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

function formatFeeChip(fee) {
  const full = formatFee(fee);
  if (!full) return '';
  return full.replace(/^Fee: /, '');
}

function groupByYear(gigs) {
  const byYear = {};
  gigs.forEach(g => {
    const d = parseGigDate(g.date);
    const year = d ? String(d.getFullYear()) : 'Unknown';
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(g);
  });
  return Object.keys(byYear)
    .sort((a, b) => Number(a) - Number(b))
    .map(year => ({ year, gigs: byYear[year] }));
}

function buildBookedList(gigs, nextGigDate) {
  const fragment = document.createDocumentFragment();

  gigs.forEach(g => {
    const isNext = nextGigDate && g.date === nextGigDate;
    const article = document.createElement('article');
    article.className = isNext ? 'gig gig--next' : 'gig';

    const dateTile = document.createElement('div');
    dateTile.className = 'gig__date';
    const dayEl = document.createElement('span');
    dayEl.className = 'gig__day';
    dayEl.textContent = String(dayNum(g.date));
    const monEl = document.createElement('span');
    monEl.className = 'gig__mon';
    monEl.textContent = monShort(g.date);
    const dowEl = document.createElement('span');
    dowEl.className = 'gig__dow';
    dowEl.textContent = dowShort(g.date);
    dateTile.append(dayEl, monEl, dowEl);

    const body = document.createElement('div');
    body.className = 'gig__body';

    const topline = document.createElement('div');
    topline.className = 'gig__topline';

    if (g.venue) {
      const venue = document.createElement('h2');
      venue.className = 'gig__venue';
      venue.textContent = g.venue;
      topline.appendChild(venue);
    }

    if (isNext) {
      const badge = document.createElement('span');
      badge.className = 'badge-next';
      badge.textContent = '★ Next gig';
      const countdown = document.createElement('span');
      countdown.className = 'gig__countdown';
      countdown.textContent = daysAway(g.date);
      topline.append(badge, countdown);
    }

    if (topline.childNodes.length) {
      body.appendChild(topline);
    }

    if (g.town) {
      const town = document.createElement('p');
      town.className = 'gig__town';
      town.append(createSvg(SVG_PIN), document.createTextNode(g.town));
      body.appendChild(town);
    }

    const metaItems = [];
    if (g.fee) {
      const feeChip = document.createElement('span');
      feeChip.className = 'chip chip--fee' + (isTbc(g.fee) ? ' chip--tbc' : '');
      feeChip.append(createSvg(SVG_MONEY), document.createTextNode(formatFeeChip(g.fee)));
      metaItems.push(feeChip);
    }
    if (g.comms) {
      const commsChip = document.createElement('span');
      commsChip.className = 'chip';
      commsChip.append(createSvg(SVG_COMMS), document.createTextNode(g.comms));
      metaItems.push(commsChip);
    }
    if (metaItems.length) {
      const meta = document.createElement('div');
      meta.className = 'gig__meta';
      metaItems.forEach(item => meta.appendChild(item));
      body.appendChild(meta);
    }

    if (g.notes) {
      const notes = document.createElement('div');
      notes.className = 'gig__notes';
      const label = document.createElement('span');
      label.className = 'gig__notes-label';
      label.textContent = 'Notes';
      notes.append(label, document.createTextNode(g.notes));
      body.appendChild(notes);
    }

    article.append(dateTile, body);
    fragment.appendChild(article);
  });

  return fragment;
}

function restoreDeleteButton(btn) {
  btn.textContent = '';
  btn.appendChild(createSvg(SVG_TRASH));
  btn.setAttribute('aria-label', `Delete ${formatDate(btn.dataset.date)}`);
  btn.disabled = false;
}

function resetDeleteConfirm() {
  confirmingDeleteDate = null;
  clearTimeout(confirmDeleteTimer);
  confirmDeleteTimer = null;
  document.querySelectorAll('.avail__del.is-confirming').forEach(btn => {
    btn.classList.remove('is-confirming');
    restoreDeleteButton(btn);
  });
}

function buildAvailCard(g) {
  const card = document.createElement('div');
  card.className = 'avail';

  const dateEl = document.createElement('span');
  dateEl.className = 'avail__date';
  dateEl.append(
    document.createTextNode(`${dayNum(g.date)} ${monShort(g.date)} `),
    Object.assign(document.createElement('span'), { className: 'avail__dow', textContent: dowShort(g.date) })
  );

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'avail__del';
  deleteBtn.dataset.date = g.date;
  deleteBtn.appendChild(createSvg(SVG_TRASH));
  deleteBtn.setAttribute('aria-label', `Delete ${formatDate(g.date)}`);
  deleteBtn.addEventListener('click', () => handleDeleteClick(g.date, deleteBtn));

  card.append(dateEl, deleteBtn);
  return card;
}

function buildAvailablePanel(gigs) {
  const fragment = document.createDocumentFragment();
  availableGigs = filterUpcomingGigs(gigs);

  const toolbar = document.createElement('div');
  toolbar.className = 'avail-toolbar';

  const hint = document.createElement('span');
  hint.className = 'avail-hint';
  hint.textContent = `${availableGigs.length} open date${availableGigs.length === 1 ? '' : 's'}`;

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'btn-ghost';
  copyBtn.textContent = 'Copy all dates';
  copyBtn.addEventListener('click', copyAvailableDates);

  toolbar.append(hint, copyBtn);
  fragment.appendChild(toolbar);

  groupByYear(availableGigs).forEach(({ year, gigs: yearGigs }) => {
    const heading = document.createElement('div');
    heading.className = 'avail-year';
    const yearLabel = document.createElement('span');
    yearLabel.textContent = year;
    const yearCount = document.createElement('span');
    yearCount.className = 'avail-year__count';
    yearCount.textContent = String(yearGigs.length);
    heading.append(yearLabel, yearCount);

    const grid = document.createElement('div');
    grid.className = 'avail-grid';
    yearGigs.forEach(g => grid.appendChild(buildAvailCard(g)));

    fragment.append(heading, grid);
  });

  return fragment;
}

function handleDeleteClick(date, btn) {
  if (confirmingDeleteDate !== date) {
    resetDeleteConfirm();
    confirmingDeleteDate = date;
    btn.classList.add('is-confirming');
    btn.textContent = 'Confirm?';
    btn.setAttribute('aria-label', `Confirm delete ${formatDate(date)}`);
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
    restoreDeleteButton(btn);
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
    const btn = document.querySelector('.avail-toolbar .btn-ghost');
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
    const booked = filterUpcomingGigs(data.gigs.filter(g => g.booked));
    const available = filterUpcomingGigs(data.gigs.filter(g => !g.booked));
    const nextGigDate = booked.length > 0 ? booked[0].date : null;

    document.getElementById('count-booked').textContent = booked.length;
    document.getElementById('count-available').textContent = available.length;

    bookedList.innerHTML = '';
    availableList.innerHTML = '';

    if (booked.length === 0) {
      bookedList.innerHTML = '<p class="empty">No upcoming booked gigs.</p>';
    } else {
      bookedList.appendChild(buildBookedList(booked, nextGigDate));
    }

    if (available.length === 0) {
      availableList.innerHTML = '<p class="empty">No upcoming available dates.</p>';
    } else {
      availableList.appendChild(buildAvailablePanel(available));
    }

    const updated = new Date(data.updated).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById('footer').textContent =
      `Ey Up Maiden · Last updated ${updated}`;
  } catch {
    const msg = '<p class="error">Could not load gig data. Please try again.</p>';
    bookedList.innerHTML = msg;
    availableList.innerHTML = msg;
  }
}

loadGigs();
