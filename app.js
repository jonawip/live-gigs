const API_URL = 'https://script.google.com/macros/s/AKfycbzoWQU-_CScGngtIuoLgUDGQj_7QHScqYXMlfFeXTjg3CL7Q9SextT947ayvOwRWB0Q/exec';

let deferredPrompt = null;

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

// Tab switching
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
function buildTable(gigs, booked) {
  const table = document.createElement('table');
  table.className = 'gig-grid';
  const venueCol = booked ? '<th scope="col">Venue</th><th scope="col">Town</th>' : '';
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Date</th>
        ${venueCol}
        <th scope="col">Fee</th>
        <th scope="col">Notes</th>
        <th scope="col">Comms</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  gigs.forEach(g => {
    const venue = booked && g.venue ? g.venue : '';
    const town = booked && g.town ? g.town : '';
    const fee = g.fee ? formatFee(g.fee) : '';
    const notes = g.notes ?? '';
    const comms = g.comms ?? '';
    const venueCells = booked ? `<td>${venue}</td><td>${town}</td>` : '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(g.date)}</td>
      ${venueCells}
      <td>${fee}</td>
      <td>${notes}</td>
      <td>${comms}</td>
    `;
    tbody.appendChild(row);
  });
  return table;
}
async function loadGigs() {
  const bookedList    = document.getElementById('list-booked');
  const availableList = document.getElementById('list-available');
  bookedList.innerHTML    = '<div class="loading">Loading…</div>';
  availableList.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const res  = await fetch(API_URL);
    const data = await res.json();
    const booked    = data.gigs.filter(g => g.booked);
    const available = data.gigs.filter(g => !g.booked);
    document.getElementById('count-booked').textContent    = booked.length;
    document.getElementById('count-available').textContent = available.length;
    bookedList.innerHTML    = '';
    availableList.innerHTML = '';
    if (booked.length === 0) {
      bookedList.innerHTML = '<p class="error">No booked gigs yet.</p>';
    } else {
      bookedList.appendChild(buildTable(booked, true));
    }
    if (available.length === 0) {
      availableList.innerHTML = '<p class="error">No available dates.</p>';
    } else {
      availableList.appendChild(buildTable(available, false));
    }
    const updated = new Date(data.updated).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById('footer').textContent =
      `Ey Up Maiden · Last updated ${updated}`;
  } catch (err) {
    const msg = '<div class="error">Could not load gig data. Please try again.</div>';
    bookedList.innerHTML    = msg;
    availableList.innerHTML = msg;
  }
}
loadGigs();
