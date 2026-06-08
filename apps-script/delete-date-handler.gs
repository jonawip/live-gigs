// Paste into the Gig Submission Form Apps Script project (same file as doPost).
//
// 1. Add the three helper functions below (anywhere in the file).
// 2. Add the delete check at the TOP of doPost(e), before the try block.
// 3. Deploy > Manage deployments > Edit > New version > Deploy

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

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
