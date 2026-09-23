/**
 * Zacs Hills Estate - lead receiver.
 *
 * Writes every enquiry into "Profitcast X Zacs Valley - Hills Estate".
 * Modelled on the eight-page landing-page receiver, trimmed to one sheet.
 *
 * DEPLOY
 *   1. script.google.com -> New project -> paste this file over Code.gs
 *   2. Save, then Deploy -> New deployment -> type "Web app"
 *        Execute as:      Me
 *        Who has access:  Anyone        <-- must be "Anyone", NOT
 *                                           "Anyone with a Google account".
 *                                           The second one silently rejects
 *                                           posts from the page.
 *   3. Authorise when prompted (it needs permission to write to the sheet).
 *   4. Copy the /exec URL and paste it into data-endpoint on the enquiry form
 *      in index.html. Until that is filled in, the form still works and still
 *      hands off to WhatsApp; it just does not record a row.
 *
 * The account running this needs EDIT access to the spreadsheet. It is owned
 * by zacsvalley@gmail.com, so either build the script in that account or have
 * the sheet shared as editor with whoever does.
 *
 * To check a deployment quickly, open the /exec URL in a browser: it answers
 * with a small JSON object rather than an error page.
 */

var SHEET_ID = '1L-yJu235aFymN9vf9PiMFj4eaPU-KhLpSe38DgrEY3s';

/* The four form fields, plus when it arrived. The page still sends gclid and
   the utm values in the payload - they are simply not written. Putting a
   column back is a matter of adding it here and to the appendRow below; the
   page needs no change, which matters because a gclid can only be read on the
   visit that carried it. */
var HEADERS = [
  'Received', 'Your name', 'Phone number', 'Preferred date', 'I am exploring'
];

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    /* The honeypot. A bot fills every field it finds, including the one hidden
       from people. Answer 200 so it learns nothing, and write no row. */
    if (p.company) return json({ ok: true });

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    ensureHeaders(sheet);

    sheet.appendRow([
      new Date(),
      safe(p.name), safe(p.phone), safe(p.date), safe(p.interest)
    ]);

    return json({ ok: true });
  } catch (err) {
    /* Logged rather than swallowed, so a failed write can be found later under
       Executions rather than only showing up as a missing lead. */
    console.error(err);
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'Zacs Hills Estate lead receiver' });
}

/**
 * Makes row 1 match HEADERS, on an empty sheet or a sheet still carrying an
 * older set.
 *
 * Written this way because the first version of this script recorded twelve
 * columns and only ever wrote the header row when the sheet was completely
 * empty. Narrowing the list in the code would otherwise have left the old
 * headings sitting above rows that no longer fill them, and required clearing
 * the sheet by hand to fix. This just corrects it on the next lead.
 */
function ensureHeaders(sheet) {
  var width = Math.max(sheet.getLastColumn(), HEADERS.length);

  if (sheet.getLastRow() > 0) {
    var row = sheet.getRange(1, 1, 1, width).getValues()[0];
    var correct = HEADERS.every(function (h, i) { return row[i] === h; }) &&
      row.slice(HEADERS.length).every(function (c) { return c === '' || c === null; });
    if (correct) return;
    sheet.getRange(1, 1, 1, width).clearContent();
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/**
 * Anything a stranger typed, made safe to put in a cell.
 *
 * Sheets treats a leading = + - @ as the start of a formula. An Indian mobile
 * arrives as "+91 ..." and lands as #ERROR!, which loses the phone number on
 * every lead - the whole point of collecting it. The same rule is the defence
 * against a name typed as =IMPORTXML(...), which would otherwise run the
 * moment the client opens the sheet. A leading apostrophe makes Sheets store
 * the value as text; the apostrophe is not part of the value and does not
 * show in the cell.
 */
function safe(v) {
  var s = (v == null ? '' : String(v)).trim();
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
