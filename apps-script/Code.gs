/**
 * Travel Planner – Google Apps Script (bound to the Google Sheet)
 * 1. Change PIN below (6 digits recommended).
 * 2. Run setup() once (creates tabs, headers, dropdowns).
 * 3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 */
const PIN = 'CHANGE-ME';

const TABS = {
  Days: ['date', 'country', 'location', 'title'],
  Items: ['id', 'date', 'end_date', 'time', 'end_time', 'type', 'title', 'place', 'lat', 'lng', 'maps_url',
          'phone', 'notes', 'status', 'ref', 'provider', 'price', 'currency', 'paid_by', 'payment',
          'cancel_until', 'doc_link'],
  Places: ['name', 'list', 'lat', 'lng', 'maps_url', 'note'],
  Settings: ['key', 'value']
};

const DROPDOWNS = {
  Days: { country: ['India', 'Sri Lanka'] },
  Items: {
    type: ['stay', 'flight', 'train', 'transfer', 'activity', 'food', 'admin'],
    status: ['booked', 'open', 'not needed'],
    currency: ['CHF', 'EUR', 'USD', 'INR', 'LKR'],
    paid_by: ['Elias', 'Sunny', 'Split'],
    payment: ['paid', 'pay on site']
  }
};

const TEXT_COLS = ['date', 'end_date', 'time', 'end_time', 'cancel_until', 'id', 'ref', 'phone'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (name) {
    const headers = TABS[name];
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#FCE8C8');
    sh.setFrozenRows(1);
    headers.forEach(function (h, i) {
      const col = sh.getRange(2, i + 1, 999, 1);
      if (TEXT_COLS.indexOf(h) >= 0) col.setNumberFormat('@');
      const list = DROPDOWNS[name] && DROPDOWNS[name][h];
      if (list) col.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build());
    });
  });
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Tabelle1');
  if (def && def.getLastRow() === 0) ss.deleteSheet(def);

  // Pre-fill Days (29 Nov – 22 Dec 2026)
  const days = ss.getSheetByName('Days');
  if (days.getLastRow() < 2) {
    const rows = [];
    for (let d = new Date(2026, 10, 29); d <= new Date(2026, 11, 22); d.setDate(d.getDate() + 1)) {
      const iso = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      rows.push([iso, iso < '2026-12-08' ? 'India' : 'Sri Lanka', '', '']);
    }
    days.getRange(2, 1, rows.length, 4).setNumberFormat('@').setValues(rows);
  }
  // Useful default tasks
  const items = ss.getSheetByName('Items');
  if (items.getLastRow() < 2) {
    const blank = function (o) { return TABS.Items.map(function (h) { return o[h] || ''; }); };
    items.getRange(2, 1, 3, TABS.Items.length).setValues([
      blank({ id: 'visa-india', type: 'admin', title: 'India e-Visa', status: 'open', notes: 'indianvisaonline.gov.in' }),
      blank({ id: 'eta-srilanka', type: 'admin', title: 'Sri Lanka ETA', status: 'open', notes: 'eta.gov.lk' }),
      blank({ id: 'insurance', type: 'admin', title: 'Travel insurance', status: 'open' })
    ]);
  }
  const st = ss.getSheetByName('Settings');
  if (st.getLastRow() < 2) {
    st.getRange(2, 1, 7, 2).setValues([
      ['traveler_1', 'Elias'], ['traveler_2', 'Sunny'], ['home_currency', 'CHF'],
      ['rate_EUR', 1.07], ['rate_USD', 1.25], ['rate_INR', 110], ['rate_LKR', 370]
    ]);
  }
}

function doGet() {
  return ContentService.createTextOutput('Travel Planner API is running.');
}

function doPost(e) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= 10) return json({ error: 'locked' });
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  if (PIN === 'CHANGE-ME' || String(body.pin) !== PIN) {
    cache.put('fails', String(fails + 1), 600);
    return json({ error: 'pin' });
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = { updated: new Date().toISOString() };
  Object.keys(TABS).forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) { out[name.toLowerCase()] = []; return; }
    const vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getDisplayValues();
    const head = vals.shift();
    out[name.toLowerCase()] = vals
      .filter(function (r) { return r.join('') !== ''; })
      .map(function (r) { const o = {}; head.forEach(function (h, i) { if (h && r[i] !== '') o[h] = r[i]; }); return o; });
  });
  return json(out);
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
