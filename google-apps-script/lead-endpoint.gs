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

var HEADERS = [
  'Received', 'Name', 'Phone', 'Preferred date', 'Interest',
  'Page', 'GCLID', 'Source', 'Medium', 'Campaign', 'Term', 'Referrer'
];

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    /* The honeypot. A bot fills every field it finds, including the one hidden
       from people. Answer 200 so it learns nothing, and write no row. */
    if (p.company) return json({ ok: true });

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    /* Header row, written once. getLastRow() is 0 on an empty sheet. */
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      safe(p.name), safe(p.phone), safe(p.date), safe(p.interest),
      safe(p.page), safe(p.gclid),
      safe(p.utm_source), safe(p.utm_medium), safe(p.utm_campaign),
      safe(p.utm_term), safe(p.referrer)
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
