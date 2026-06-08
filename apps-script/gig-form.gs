// Ey Up Maiden – Gig Submission Form
// Google Apps Script web app
// Deploy as: Deploy > Manage deployments > Edit > New version > Deploy
// Execute as: Me | Who has access: Anyone

const SHEET_ID   = '1rjwFx2IVF2pw3JpZBDFllzXOlTy9rMTBOj3cf1ih06A';
const SHEET_NAME = '2026 Dates';

// ── Serve the form ─────────────────────────────────────────────────────────

function doGet() {
  return HtmlService
    .createHtmlOutput(getFormHtml())
    .setTitle('Ey Up Maiden – Add a Gig')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Handle submission & delete ─────────────────────────────────────────────

function doPost(e) {
  if (e.parameter.action === 'delete') {
    return handleDeleteDate(e);
  }

  try {
    const data = e.parameter;
    const tz = Session.getScriptTimeZone();
    const dateStr = formatDateFromFormInput(data.date, tz);
    const rowValues = buildGigRow(dateStr, data);

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    const existingRow = findFreeDateRowIndex(sheet, data.date, tz);

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    return HtmlService
      .createHtmlOutput(getSuccessHtml(data.venue, dateStr, existingRow > 0))
      .setTitle(existingRow > 0 ? 'Gig Updated!' : 'Gig Added!');

  } catch (err) {
    return HtmlService
      .createHtmlOutput('<p style="color:red;font-family:sans-serif;padding:2rem">Error: ' + err.message + '</p>')
      .setTitle('Error');
  }
}

// ── Delete available date ────────────────────────────────────────────────────

function handleDeleteDate(e) {
  var formattedDate = e.parameter.date ? String(e.parameter.date).trim() : '';
  if (!formattedDate) {
    return jsonResponse({ success: false, error: 'Missing date' });
  }

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) {
    return jsonResponse({ success: false, error: "Sheet '" + SHEET_NAME + "' not found" });
  }

  var data = sheet.getDataRange().getValues();
  var tz = Session.getScriptTimeZone();

  for (var i = 1; i < data.length; i++) {
    var rowDate = formatRowDateForMatch(data[i][0], tz);
    if (rowDate !== formattedDate) continue;

    var town = data[i][1] ? String(data[i][1]).trim() : '';
    var venue = data[i][2] ? String(data[i][2]).trim() : '';
    if (town !== '' || venue !== '') {
      return jsonResponse({ success: false, error: 'Only available dates can be deleted' });
    }

    sheet.deleteRow(i + 1);
    return jsonResponse({ success: true, deleted: formattedDate });
  }

  return jsonResponse({ success: false, error: 'Date not found' });
}

function formatRowDateForMatch(rawDate, tz) {
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return Utilities.formatDate(rawDate, tz, 'EEEE d MMMM yyyy');
  }
  return rawDate ? String(rawDate).trim() : '';
}

function formatDateFromFormInput(isoDate, tz) {
  var parts = String(isoDate).split('-');
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  return Utilities.formatDate(d, tz, 'EEEE d MMMM yyyy');
}

function formDateKey(isoDate, tz) {
  var parts = String(isoDate).split('-');
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}

function rowDateKey(cellValue, tz) {
  if (cellValue instanceof Date && !isNaN(cellValue.getTime())) {
    return Utilities.formatDate(cellValue, tz, 'yyyy-MM-dd');
  }
  var s = String(cellValue).trim();
  if (!s) return '';
  var parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, tz, 'yyyy-MM-dd');
  }
  return s;
}

function findFreeDateRowIndex(sheet, isoDate, tz) {
  var data = sheet.getDataRange().getValues();
  var targetKey = formDateKey(isoDate, tz);

  for (var i = 1; i < data.length; i++) {
    if (rowDateKey(data[i][0], tz) !== targetKey) continue;

    var town = data[i][1] ? String(data[i][1]).trim() : '';
    var venue = data[i][2] ? String(data[i][2]).trim() : '';
    if (town === '' && venue === '') return i + 1;
  }

  return -1;
}

function buildGigRow(dateStr, data) {
  return [
    dateStr,
    data.town      || '',
    data.venue     || '',
    data.fee       || '',
    data.notes     || '',
    data.comms     || '',
    data.startTime || '19:00',
    data.endTime   || '23:45',
    'FALSE',
    '',
    ''
  ];
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Form HTML ──────────────────────────────────────────────────────────────

function getFormHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Add a Gig</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root { color-scheme: dark; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f0f;
    color: #f0f0f0;
    min-height: 100vh;
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
  }

  .header {
    background: #1a1a1a;
    border-bottom: 1px solid #2a2a2a;
    padding: 20px 20px 16px;
    text-align: center;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #e8c84a;
    line-height: 1;
  }
  .header p {
    font-size: 13px;
    color: #666;
    margin-top: 4px;
  }

  .section {
    padding: 20px 16px 0;
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 10px;
    padding-left: 4px;
  }

  .card {
    background: #1a1a1a;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid #2a2a2a;
  }

  .row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid #222;
    position: relative;
  }
  .row:last-child { border-bottom: none; }

  .row-icon {
    width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    padding-left: 4px;
  }

  .row-body {
    flex: 1;
    min-width: 0;
    padding: 0 12px 0 0;
  }

  .row-label {
    font-size: 12px;
    color: #666;
    font-weight: 600;
    padding-top: 10px;
    display: block;
    letter-spacing: 0.03em;
  }
  .req { color: #e8c84a; }

  input, textarea {
    background: transparent;
    border: none;
    color: #f0f0f0;
    font-size: 16px;
    font-family: inherit;
    width: 100%;
    padding: 4px 0 10px;
    display: block;
    -webkit-appearance: none;
    appearance: none;
  }
  input:focus, textarea:focus { outline: none; }
  input::placeholder, textarea::placeholder { color: #444; }

  input[type="date"],
  input[type="time"] {
    color: #f0f0f0;
    min-width: 0;
  }

  .time-pair {
    display: flex;
    gap: 0;
  }
  .time-pair .row {
    flex: 1;
  }
  .time-pair .row:first-child {
    border-right: 1px solid #222;
  }

  textarea {
    resize: none;
    min-height: 72px;
    line-height: 1.5;
  }

  .submit-wrap {
    padding: 20px 16px 40px;
  }
  button[type=submit] {
    background: #e8c84a;
    color: #111;
    border: none;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 18px;
    width: 100%;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    font-family: inherit;
    transition: opacity 0.15s;
  }
  button[type=submit]:active { opacity: 0.75; }

  .loading { display: none; text-align: center; padding: 40px 20px; color: #666; }
</style>
</head>
<body>

<div class="header">
  <h1>Ey Up Maiden</h1>
  <p>Add a new gig</p>
</div>

<form method="POST" id="gigForm">

  <div class="section">
    <div class="section-title">When &amp; Where</div>
    <div class="card">

      <div class="row">
        <div class="row-icon">📅</div>
        <div class="row-body">
          <span class="row-label">Date <span class="req">*</span></span>
          <input type="date" name="date" id="dateInput" required>
        </div>
      </div>

      <div class="row">
        <div class="row-icon">📍</div>
        <div class="row-body">
          <span class="row-label">Town / City <span class="req">*</span></span>
          <input type="text" name="town" required placeholder="e.g. Burnley"
                 autocomplete="off" autocapitalize="words">
        </div>
      </div>

      <div class="row">
        <div class="row-icon">🎸</div>
        <div class="row-body">
          <span class="row-label">Venue <span class="req">*</span></span>
          <input type="text" name="venue" required placeholder="e.g. Sanctuary Rock Bar"
                 autocomplete="off" autocapitalize="words">
        </div>
      </div>

      <div class="time-pair">
        <div class="row">
          <div class="row-icon">⏰</div>
          <div class="row-body">
            <span class="row-label">Start</span>
            <input type="time" name="startTime" value="19:00">
          </div>
        </div>
        <div class="row">
          <div class="row-icon">🏁</div>
          <div class="row-body">
            <span class="row-label">End</span>
            <input type="time" name="endTime" value="23:45">
          </div>
        </div>
      </div>

    </div>
  </div>

  <div class="section">
    <div class="section-title">Deal</div>
    <div class="card">
      <div class="row">
        <div class="row-icon">💷</div>
        <div class="row-body">
          <span class="row-label">Agreed Fee</span>
          <input type="text" name="fee" placeholder="£400, Ticketed, Door Split…"
                 autocomplete="off">
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Info</div>
    <div class="card">

      <div class="row">
        <div class="row-icon">💬</div>
        <div class="row-body">
          <span class="row-label">Comms</span>
          <input type="text" name="comms" placeholder="Kurt FB / email / call…"
                 autocomplete="off">
        </div>
      </div>

      <div class="row">
        <div class="row-icon">📝</div>
        <div class="row-body">
          <span class="row-label">Notes</span>
          <textarea name="notes" placeholder="PA needed? Anything else worth knowing…"></textarea>
        </div>
      </div>

    </div>
  </div>

  <div class="submit-wrap">
    <button type="submit">Add Gig</button>
  </div>

</form>

<div class="loading" id="loading">Saving gig...</div>

<script>
  (function() {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm   = String(d.getMonth() + 1).padStart(2, '0');
    var dd   = String(d.getDate()).padStart(2, '0');
    document.getElementById('dateInput').value = yyyy + '-' + mm + '-' + dd;
  })();
</script>

</body>
</html>`;
}

// ── Success page ───────────────────────────────────────────────────────────

function getSuccessHtml(venue, dateStr, updated) {
  var heading = updated ? 'Gig updated!' : 'Gig added!';
  var detail = updated
    ? 'An available date was replaced with this booking.'
    : "It's in the sheet. Jon will deal with the rest.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gig Added!</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #111; color: #f0f0f0;
    min-height: 100vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 2rem; text-align: center; gap: 1.2rem;
  }
  h1 { font-size: 1.8rem; color: #e8c84a; }
  p  { color: #aaa; font-size: 1rem; line-height: 1.5; }
  a  {
    display: inline-block; margin-top: 1rem;
    background: #e8c84a; color: #111;
    text-decoration: none; font-weight: 700;
    padding: 0.8rem 2rem; border-radius: 8px;
    text-transform: uppercase; letter-spacing: 0.05em;
    font-size: 0.9rem;
  }
</style>
</head>
<body>
  <h1>${heading}</h1>
  <p><strong>${venue}</strong><br>${dateStr}</p>
  <p>${detail}</p>
  <a href="${ScriptApp.getService().getUrl()}">Add another</a>
</body>
</html>`;
}
