/* India × Sri Lanka – travel app. Plain JS, no build step. */
(() => {
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const API = (window.CONFIG && CONFIG.API_URL) || '';
const DEMO = !API;
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

let D = { days: [], items: [], places: [], settings: [] };
let S = {};          // settings as key → value
let online = true;
let bookingMode = LS.get('bookingMode') === '1';
let map, mapLayer, lastDay = null;

const EMOJI = { stay: '🛏️', flight: '✈️', train: '🚆', transfer: '🚗', activity: '📍', food: '🍛', admin: '📄' };
const FLAG = { 'India': '🇮🇳', 'Sri Lanka': '🇱🇰' };
const FACTS = {
  'India': [
    'India lists 22 languages in its constitution – Hindi and English are just the start.',
    'Chess most likely grew out of chaturanga, a game from ancient India.',
    'The Taj Mahal changes colour with the light: pinkish at dawn, golden at sunset.',
    'Jaipur was painted pink in 1876 to welcome the Prince of Wales.',
    'Indian Railways is one of the largest employers on the planet.',
    '"Chai" simply means tea – so "chai tea" is tea tea.',
    'Lake Pichola in Udaipur is man-made – it was created in the 14th century.'
  ],
  'Sri Lanka': [
    'Ceylon tea kept the island\'s old name – Sri Lanka is one of the world\'s biggest tea exporters.',
    'Sigiriya\'s Lion Rock rises about 180 m above the jungle.',
    'In 1960 Sri Lanka elected the world\'s first female prime minister, Sirimavo Bandaranaike.',
    'True cinnamon comes from Sri Lanka – that\'s why it\'s called Ceylon cinnamon.',
    'Sri Lankan New Year is celebrated in April, not January.',
    'In Minneriya, hundreds of wild elephants meet each year – "The Gathering".',
    'Ayubowan means "may you live long".'
  ]
};
const PIN_FAILS = ['A monkey stole that PIN 🐒', 'Nope. Even the cows know that\'s wrong 🐄', 'Wrong PIN. Have some chai and try again ☕', 'Close… but no samosa 🥟'];

/* ---------- helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateOf = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (iso, n) => { const d = dateOf(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const diffDays = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 864e5);
const fmt = (iso, o) => dateOf(iso).toLocaleDateString('en-GB', o);
const fmtDay = iso => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
const today = () => new URLSearchParams(location.search).get('today') || isoOf(new Date());
const num = v => {
  if (v == null || v === '') return null;
  let s = String(v).replace(/[^\d.,-]/g, '');
  s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  const n = parseFloat(s); return isNaN(n) ? null : n;
};
const home = () => S.home_currency || 'CHF';
const toHome = it => {
  const p = num(it.price); if (p == null) return null;
  const c = (it.currency || home()).toUpperCase();
  if (c === home()) return p;
  const r = num(S['rate_' + c]); return r ? p / r : null;
};
const money = (n, cur = home()) => n == null ? '' : `${cur} ${Math.round(n).toLocaleString('de-CH')}`;
const who = name => name === (S.traveler_2 || 'Sunny') ? `☀️ ${esc(name)}` : esc(name || '');
const hasGeo = it => it && num(it.lat) != null && num(it.lng) != null;
const geoStr = it => hasGeo(it) ? `${num(it.lat)},${num(it.lng)}` : (it.place || '');
const mapsLink = it => it.maps_url || (it.place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place)}`
  : hasGeo(it) ? `https://www.google.com/maps/search/?api=1&query=${geoStr(it)}` : '');
const ago = iso => { const m = Math.round((Date.now() - new Date(iso)) / 6e4); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
}
function rain(chars = ['🌼', '🏵️', '🌸'], n = 28) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span'); p.className = 'petal';
    p.textContent = chars[i % chars.length];
    p.style.left = Math.random() * 100 + 'vw';
    p.style.fontSize = 16 + Math.random() * 18 + 'px';
    p.style.animationDuration = 2.5 + Math.random() * 2.5 + 's';
    p.style.animationDelay = Math.random() * 1.2 + 's';
    document.body.appendChild(p); setTimeout(() => p.remove(), 6500);
  }
}

/* ---------- data logic ---------- */
const days = () => D.days.filter(d => d.date).sort((a, b) => a.date.localeCompare(b.date));
const tripStart = () => days()[0]?.date;
const tripEnd = () => days().slice(-1)[0]?.date;
const dayInfo = iso => D.days.find(d => d.date === iso) || { date: iso };
const countryOf = iso => dayInfo(iso).country || 'India';
const cc = iso => countryOf(iso) === 'Sri Lanka' ? 'c-lanka' : 'c-india';
const stays = () => D.items.filter(i => i.type === 'stay' && i.date);
const stayFor = night => stays().find(s => s.date <= night && night < (s.end_date || addDays(s.date, 1)));
const checkoutOn = iso => stays().filter(s => s.end_date === iso);
const itemsOn = iso => D.items
  .filter(i => i.type !== 'stay' && i.date && i.date <= iso && iso <= (i.end_date || i.date))
  .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
const nights = () => days().slice(0, -1).map(d => d.date);
const missingNights = () => nights().filter(n => !stayFor(n));
const isOpen = it => it.status === 'open';
const deadlineSoon = it => it.cancel_until && it.status === 'booked' && it.cancel_until >= today() && diffDays(today(), it.cancel_until) <= 7;
const dayHasOpen = iso => itemsOn(iso).some(isOpen) || (stayFor(iso) && isOpen(stayFor(iso))) || (iso !== tripEnd() && !stayFor(iso));

function statusChips(it) {
  if (!bookingMode || !it.status) return '';
  const c = [];
  if (it.status === 'booked') c.push(`<span class="chip booked">✓ booked</span>`);
  else if (it.status === 'open') c.push(`<span class="chip open">to book</span>`);
  if (it.payment === 'pay on site') c.push(`<span class="chip">pay on site</span>`);
  if (deadlineSoon(it)) c.push(`<span class="chip warn">free cancel until ${fmt(it.cancel_until, { day: 'numeric', month: 'short' })}</span>`);
  if (it.ref) c.push(`<span class="chip">#${esc(it.ref)}</span>`);
  return `<div class="chips">${c.join('')}</div>`;
}

/* ---------- loading ---------- */
function applyData(data) {
  D = { days: data.days || [], items: data.items || [], places: data.places || [], settings: data.settings || [], updated: data.updated };
  S = {}; D.settings.forEach(r => { if (r.key) S[r.key] = r.value; });
  D.items.forEach((it, i) => { if (!it.id) it.id = 'row' + i; });
  document.body.classList.toggle('lanka', countryOf(today()) === 'Sri Lanka' && today() >= tripStart());
  greet(); route();
}

async function load() {
  document.body.classList.add('loading');
  try {
    let data;
    if (DEMO) {
      data = await (await fetch('demo-data.json', { cache: 'no-store' })).json();
    } else {
      const pin = LS.get('pin');
      if (!pin) return showPin();
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ pin }) });
      data = await res.json();
      if (data.error) { LS.del('pin'); return showPin(data.error === 'locked' ? 'Too many tries. Take a 10-minute chai break ☕' : null); }
      LS.set('data', JSON.stringify(data));
    }
    online = true; applyData(data);
  } catch (e) {
    online = false; greet(); route();
    toast('Offline – showing saved data 📴');
  } finally {
    setTimeout(() => document.body.classList.remove('loading'), 600);
  }
}

function showPin(msg) {
  $('#pin').classList.remove('hidden');
  const m = $('#pin-msg'); m.textContent = msg || '';
  if (msg) { $('.pin-card').classList.remove('shake'); void m.offsetWidth; $('.pin-card').classList.add('shake'); }
  setTimeout(() => $('#pin-input').focus(), 100);
}
let pinTries = 0;
$('#pin-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pin = $('#pin-input').value.trim(); if (!pin) return;
  LS.set('pin', pin); $('#pin-input').value = '';
  document.body.classList.add('loading');
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ pin }) });
    const data = await res.json();
    if (data.error) {
      LS.del('pin');
      showPin(data.error === 'locked' ? 'Too many tries. Take a 10-minute chai break ☕' : PIN_FAILS[pinTries++ % PIN_FAILS.length]);
    } else {
      LS.set('data', JSON.stringify(data)); $('#pin').classList.add('hidden');
      applyData(data); toast(`Namaste, ${S.traveler_1 || 'Elias'} & ${S.traveler_2 || 'Sunny'} 🙏`);
    }
  } catch (err) { showPin('No connection. Try again when online.'); }
  document.body.classList.remove('loading');
});

/* ---------- header ---------- */
function greet() {
  const t = today(), s = tripStart(), e = tripEnd(); let g = '';
  if (!s) g = 'Add days in the sheet to get started';
  else if (t < s) { const n = diffDays(t, s); g = n === 1 ? 'Tomorrow we fly! ✈️' : `Namaste 🙏 · ${n} days to go`; }
  else if (t > e) g = 'Back home. What a trip ❤️';
  else {
    const n = diffDays(s, t) + 1, total = diffDays(s, e) + 1;
    g = `${countryOf(t) === 'Sri Lanka' ? 'Ayubowan' : 'Namaste'} 🙏 · Day ${n} of ${total} · ${esc(dayInfo(t).location || '')}`;
  }
  $('#greeting').innerHTML = g;
}
let brandTaps = 0;
$('#brand').addEventListener('click', () => {
  brandTaps++; clearTimeout(brandTaps.t);
  if (brandTaps >= 5) { brandTaps = 0; rain(); toast('Marigolds for you two 🌼'); }
  setTimeout(() => { brandTaps = 0; }, 1500);
});
$('#refresh').addEventListener('click', load);
const toggle = $('#booking-toggle');
toggle.checked = bookingMode;
toggle.addEventListener('change', () => {
  bookingMode = toggle.checked; LS.set('bookingMode', bookingMode ? '1' : '0');
  if (!bookingMode && location.hash === '#bookings') location.hash = '#days'; else route();
});

/* ---------- routing ---------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1)) || 'days';
  const [tab, arg] = h.split('/');
  $('#tab-bookings').classList.toggle('hidden', !bookingMode);
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === (tab === 'day' ? 'days' : tab)));
  document.documentElement.style.setProperty('--head-h', $('.top').offsetHeight + 'px');
  $('#view').className = tab === 'day' && arg ? cc(arg) : '';
  document.body.classList.toggle('dayview', tab === 'day' && !!arg);
  const isMap = tab === 'map';
  $('#map-wrap').classList.toggle('hidden', !isMap);
  $('#view').classList.toggle('hidden', isMap);
  if (isMap) return renderMap(arg);
  if (tab === 'day' && arg) renderDay(arg);
  else if (tab === 'bookings' && bookingMode) renderBookings();
  else renderDays();
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); route(); });

// Swipe right in a day view → back to the overview
let touch = null;
document.addEventListener('touchstart', e => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY, t: Date.now() }; }, { passive: true });
document.addEventListener('touchend', e => {
  if (!touch || !document.body.classList.contains('dayview') || !$('#sheet').classList.contains('hidden')) return;
  const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = Math.abs(t.clientY - touch.y);
  if (dx > 70 && dy < 60 && Date.now() - touch.t < 700) {
    $('#view').classList.add('slide-out'); setTimeout(() => { location.hash = 'days'; }, 160);
  }
  touch = null;
}, { passive: true });

/* ---------- Days list ---------- */
function renderDays() {
  const t = today(), list = days(), s = tripStart(), e = tripEnd();
  let hero = '';
  const garland = `<div class="garland" aria-hidden="true">${Array.from({ length: 11 }, (_, i) => `<span style="--i:${i}">${i % 2 ? '🏵️' : '🌼'}</span>`).join('')}</div>`;
  if (s && t >= s && t <= e) {
    const st = stayFor(t);
    hero = `<div class="card hero"><h2>Today in ${esc(dayInfo(t).location || '…')}</h2>
      <p>${esc(dayInfo(t).title || '')}${st ? ` · 🛏️ ${esc(st.title)}` : ''}</p>
      <a class="btn primary" href="#day/${t}">Open today →</a></div>`;
  } else if (s && t < s) {
    const n = diffDays(t, s);
    hero = `<div class="card hero"><h2>${n === 1 ? 'Bags packed?' : `${n} days to go`}</h2>
      <p>${fmtDay(s)} – ${fmtDay(e)} · ${list.length} days · ${new Set(list.map(d => d.location).filter(Boolean)).size} places</p></div>`;
  } else if (e && t > e) hero = summaryCard();
  hero = hero.replace('<div class="card hero">', `<div class="card hero">${garland}`);
  if (DEMO) hero += `<div class="demo">Demo data – connect the Google Sheet in config.js</div>`;
  else if (D.updated) hero += `<p class="muted" style="font-size:12px;text-align:center;margin:6px 0 0">${online ? 'Updated' : 'Offline · data from'} ${ago(D.updated)}</p>`;

  let html = hero, lastC = '', rowI = 0;
  list.forEach(d => {
    const c = d.country || 'India';
    if (c !== lastC) {
      const n = list.filter(x => (x.country || 'India') === c).length;
      html += `<div class="country ${cc(d.date)}">${FLAG[c] || ''} ${esc(c)} <small>${n} days</small></div>`; lastC = c;
    }
    const st = stayFor(d.date), cls = [cc(d.date), d.date === t ? 'today' : '', d.date < t ? 'past' : ''].join(' ');
    const flags = bookingMode ? (d.date !== e && !st ? '<span class="dot warn"></span>' : dayHasOpen(d.date) ? '<span class="dot open"></span>' : '') : '';
    const sub = st ? `🛏️ ${esc(st.title)}` : d.date === e ? '🏠 Home' : '<span style="color:var(--warn)">🛏️ no stay yet</span>';
    html += `<button class="day-row ${cls}" id="d-${d.date}" style="--i:${rowI++}" onclick="location.hash='day/${d.date}'">
      <div class="dnum"><b>${dateOf(d.date).getDate()}</b><span>${fmt(d.date, { month: 'short' })}</span></div>
      <div class="dmain"><div class="dtitle">${esc(d.location || fmt(d.date, { weekday: 'long' }))}${d.title ? ` · <span style="font-weight:400">${esc(d.title)}</span>` : ''}</div>
      <div class="dsub">${fmt(d.date, { weekday: 'short' })} · ${sub}</div></div>${flags}</button>`;
  });
  if (!list.length) html += `<div class="empty">No days yet. Fill the <b>Days</b> tab in the sheet.</div>`;
  $('#view').innerHTML = html;
  // Coming back from a day → land on that day; first open → land on today
  const back = lastDay && document.getElementById('d-' + lastDay);
  if (back) { back.scrollIntoView({ block: 'center' }); lastDay = null; }
  else { const td = $('.day-row.today'); if (td && !renderDays.scrolled) { renderDays.scrolled = true; td.scrollIntoView({ block: 'center' }); } }
}

function summaryCard() {
  const st = stays().filter(s => hasGeo(s)).sort((a, b) => a.date.localeCompare(b.date));
  let km = 0;
  for (let i = 1; i < st.length; i++) km += haversine(st[i - 1], st[i]);
  const flights = D.items.filter(i => i.type === 'flight').length, trains = D.items.filter(i => i.type === 'train').length;
  const places = new Set(days().map(d => d.location).filter(Boolean)).size;
  return `<div class="card hero"><h2>What a trip ❤️</h2>
    <p>${days().length} days · ${places} places · ${flights} flights · ${trains} train rides · ~${Math.round(km).toLocaleString('de-CH')} km between beds</p></div>`;
}
function haversine(a, b) {
  const R = 6371, r = x => x * Math.PI / 180, la1 = num(a.lat), la2 = num(b.lat);
  const dLa = r(la2 - la1), dLo = r(num(b.lng) - num(a.lng));
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ---------- Day view ---------- */
function renderDay(iso) {
  const list = days(), idx = list.findIndex(d => d.date === iso);
  if (idx < 0) { if (D.days.length) location.hash = 'days'; return; }
  const d = list[idx], prev = list[idx - 1], next = list[idx + 1], st = stayFor(iso), items = itemsOn(iso);
  const crossed = prev && (prev.country || 'India') !== (d.country || 'India');
  // Short summary: the day's title from the sheet, otherwise the first few plan items
  const summary = d.title || items.filter(i => i.type !== 'flight').slice(0, 3).map(i => i.title).join(' · ');
  lastDay = iso;

  let sleep;
  if (st) {
    const extra = st.date === iso ? (st.time ? `Check-in ${esc(st.time)}` : 'Check-in today') : `Night ${diffDays(st.date, iso) + 1} of ${diffDays(st.date, st.end_date || addDays(st.date, 1))}`;
    sleep = `<div class="card sleep" data-item="${esc(st.id)}"><div class="emoji">🛏️</div><div><div class="sleep-title">${esc(st.title)}</div>
      <div class="muted" style="font-size:13px">${extra}${st.place ? ' · ' + esc(st.place) : ''}</div>${statusChips(st)}</div></div>`;
  } else if (iso === tripEnd()) sleep = `<div class="card sleep"><div class="emoji">🏠</div><div class="sleep-title">Home sweet home</div></div>`;
  else sleep = `<div class="card sleep missing"><div class="emoji">⚠️</div><div class="sleep-title">No place to sleep yet</div></div>`;

  const rows = [];
  checkoutOn(iso).forEach(s => rows.push({ it: s, time: s.end_time || '', sort: s.end_time || '00', title: `Check-out · ${s.title}`, emoji: '🧳', notes: '' }));
  items.forEach(it => rows.push({ it, time: it.time || '', sort: it.time || '99', title: it.title, emoji: EMOJI[it.type] || '📍', notes: it.notes }));
  rows.sort((a, b) => a.sort.localeCompare(b.sort));
  const tl = rows.length ? rows.map(r => `<div class="t-item" data-item="${esc(r.it.id)}">
      <div class="t-time">${esc(r.time) || '·'}</div>
      <div class="t-main"><div class="t-title">${r.emoji} ${esc(r.title)}${r.it.end_time && r.it.type !== 'stay' ? ` <span class="muted" style="font-weight:400">→ ${esc(r.it.end_time)}</span>` : ''}</div>
      ${r.notes ? `<div class="t-notes">${esc(r.notes)}</div>` : ''}${r.it.type !== 'stay' ? statusChips(r.it) : ''}</div></div>`).join('')
    : `<div class="empty">Nothing planned – a free day 🌴</div>`;

  const routeUrl = dayRoute(iso);
  $('#view').innerHTML = `
    <button class="back-btn" onclick="location.hash='days'"><span>‹</span> All days</button>
    <div class="dayhead ${cc(iso)}">
      <div class="decor" aria-hidden="true">${countryOf(iso) === 'Sri Lanka' ? '🌴' : '🪷'}</div>
      <div class="dayhead-nav">
        <button class="nav-btn" ${prev ? `onclick="location.hash='day/${prev.date}'"` : 'disabled'}>‹ ${prev ? fmt(prev.date, { day: 'numeric', month: 'short' }) : ''}</button>
        <button class="daybadge" id="daybadge">${fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' })}</button>
        <button class="nav-btn" ${next ? `onclick="location.hash='day/${next.date}'"` : 'disabled'}>${next ? fmt(next.date, { day: 'numeric', month: 'short' }) : ''} ›</button>
      </div>
      <h2>${esc(d.location || fmt(iso, { weekday: 'long' }))}</h2>
      ${summary ? `<p>${esc(summary)}</p>` : ''}
      ${crossed ? `<div class="border-cross">${FLAG[prev.country] || ''} → ${FLAG[d.country] || ''} Welcome to ${esc(d.country)}!</div>` : ''}
    </div>
    <div class="section-title">Sleep</div>${sleep}
    <div class="section-title">Plan</div><div class="card timeline">${tl}</div>
    <div class="btn-row">
      <a class="btn" href="#map/${iso}">🗺️ Map</a>
      <a class="btn primary ${routeUrl ? '' : 'disabled'}" href="${routeUrl || '#'}" target="_blank" rel="noopener">↗ Route</a>
    </div>`;
  $('#daybadge').onclick = () => { const f = FACTS[countryOf(iso)] || FACTS.India; toast(`${FLAG[countryOf(iso)] || ''} ${f[Math.floor(Math.random() * f.length)]}`, 6000); };
}

// Google Maps route: where you wake up → today's stops → tonight's bed (or the airport on flight days)
function dayRoute(iso) {
  const pts = [], wake = stayFor(addDays(iso, -1)), sleep = stayFor(iso);
  if (wake) pts.push(wake);
  for (const it of itemsOn(iso)) {
    if (!hasGeo(it) && !it.place) continue;
    pts.push(it);
    if (it.type === 'flight') { pts.flight = true; break; }
  }
  if (!pts.flight && sleep && sleep !== wake) pts.push(sleep);
  const locs = pts.map(geoStr).filter((v, i, a) => v && v !== a[i - 1]);
  if (locs.length < 2) return '';
  const o = locs.shift(), dest = locs.pop(), wp = locs.slice(0, 9);
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(dest)}${wp.length ? '&waypoints=' + encodeURIComponent(wp.join('|')) : ''}`;
}

/* ---------- Item detail sheet ---------- */
function openItem(id) {
  const it = D.items.find(i => i.id === id); if (!it) return;
  const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><span>${v}</span></div>` : '';
  const when = it.type === 'stay'
    ? `${fmtDay(it.date)}${it.time ? ' ' + esc(it.time) : ''} → ${it.end_date ? fmtDay(it.end_date) : ''}${it.end_time ? ' ' + esc(it.end_time) : ''}`
    : it.date ? `${fmtDay(it.date)}${it.time ? ' · ' + esc(it.time) : ''}${it.end_time ? '–' + esc(it.end_time) : ''}` : '';
  const link = mapsLink(it), phone = (it.phone || '').replace(/[^\d+]/g, '');
  const conv = toHome(it), cur = (it.currency || home()).toUpperCase();
  const price = num(it.price) != null ? `${money(num(it.price), cur)}${cur !== home() && conv != null ? ` <span class="muted">≈ ${money(conv)}</span>` : ''}` : '';
  $('#sheet-content').innerHTML = `
    <div class="muted" style="font-size:13px">${EMOJI[it.type] || '📍'} ${esc(it.type || '')}</div>
    <h3>${esc(it.title || 'Untitled')}</h3>
    <div class="card" style="padding:4px 14px">
      ${kv('When', when)}${kv('Where', esc(it.place))}${it.notes ? `<div class="kv" style="display:block"><span class="notes">${esc(it.notes)}</span></div>` : ''}
    </div>
    <div class="btn-row">
      ${link ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">📍 Google Maps</a>` : ''}
      ${phone ? `<a class="btn" href="tel:${esc(phone)}">📞 Call</a><a class="btn" href="https://wa.me/${esc(phone.replace('+', ''))}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
      ${it.doc_link ? `<a class="btn" href="${esc(it.doc_link)}" target="_blank" rel="noopener">📄 Confirmation</a>` : ''}
    </div>
    ${bookingMode || it.ref ? `<div class="section-title">Booking</div><div class="card" style="padding:4px 14px">
      ${kv('Status', esc(it.status || '–'))}${kv('Ref', it.ref ? `<span id="ref-copy" style="text-decoration:underline dotted">${esc(it.ref)}</span>` : '')}
      ${kv('Provider', esc(it.provider))}${kv('Price', price)}${kv('Paid by', who(it.paid_by))}${kv('Payment', esc(it.payment))}
      ${kv('Free cancel until', it.cancel_until ? fmtDay(it.cancel_until) : '')}</div>` : ''}`;
  $('#sheet').classList.remove('hidden');
  const rc = $('#ref-copy');
  if (rc) rc.onclick = () => { navigator.clipboard?.writeText(it.ref).then(() => toast('Ref copied 📋')); };
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-item]'); if (el) openItem(el.dataset.item);
  if (e.target.closest('[data-close]')) $('#sheet').classList.add('hidden');
});

/* ---------- Bookings ---------- */
function renderBookings() {
  const filter = LS.get('bFilter') || 'open';
  const priced = D.items.filter(i => num(i.price) != null);
  const sum = arr => arr.reduce((a, i) => a + (toHome(i) || 0), 0);
  const booked = priced.filter(i => i.status === 'booked');
  const paid = priced.filter(i => i.payment === 'paid');
  const onSite = booked.filter(i => i.payment === 'pay on site');
  const open = D.items.filter(isOpen), missing = missingNights();

  const t1 = S.traveler_1 || 'Elias', t2 = S.traveler_2 || 'Sunny'; let p1 = 0, p2 = 0;
  paid.forEach(i => { const v = toHome(i) || 0; if (i.paid_by === t1) p1 += v; else if (i.paid_by === t2) p2 += v; else if (i.paid_by === 'Split') { p1 += v / 2; p2 += v / 2; } });
  const bal = p1 - (p1 + p2) / 2;
  const settle = Math.abs(bal) < 1 ? 'All square 🤝' : bal > 0 ? `${who(t2)} owes ${esc(t1)} <b>${money(bal)}</b>` : `${esc(t1)} owes ${who(t2)} <b>${money(-bal)}</b>`;

  const rowsFor = {
    open: () => [...missing.map(n => ({ missing: n })), ...open],
    onsite: () => onSite,
    deadlines: () => D.items.filter(i => i.cancel_until && i.status === 'booked' && i.cancel_until >= today()).sort((a, b) => a.cancel_until.localeCompare(b.cancel_until)),
    booked: () => D.items.filter(i => i.status === 'booked'),
    all: () => D.items.filter(i => i.status || num(i.price) != null)
  };
  const rows = (rowsFor[filter] || rowsFor.open)().sort((a, b) => ((a.date || a.missing || '0') + '').localeCompare((b.date || b.missing || '0') + ''));
  const allDone = !open.length && !missing.length && D.items.length > 0;

  const list = rows.map(i => {
    if (i.missing) return `<div class="b-row" onclick="location.hash='day/${i.missing}'"><div class="b-emoji">🛏️</div>
      <div class="b-main"><b>No stay yet</b><div class="muted" style="font-size:13px">Night of ${fmtDay(i.missing)} · ${esc(dayInfo(i.missing).location || '')}</div></div></div>`;
    const v = toHome(i), cur = (i.currency || home()).toUpperCase();
    return `<div class="b-row" data-item="${esc(i.id)}"><div class="b-emoji">${EMOJI[i.type] || '📍'}</div>
      <div class="b-main"><b>${esc(i.title)}</b><div class="muted" style="font-size:13px">${i.date ? fmtDay(i.date) : 'Before the trip'}${i.paid_by ? ' · ' + who(i.paid_by) : ''}</div>${statusChips(i)}</div>
      ${num(i.price) != null ? `<div class="b-price">${money(v)}${cur !== home() ? `<small>${money(num(i.price), cur)}</small>` : ''}</div>` : ''}</div>`;
  }).join('');

  $('#view').innerHTML = `
    ${allDone ? `<div class="card celebrate">Everything is booked. Time to relax 🧘</div>` : ''}
    <div class="stats">
      <div class="stat"><small>Trip cost (booked)</small><b>${money(sum(booked))}</b></div>
      <div class="stat"><small>Paid so far</small><b>${money(sum(paid))}</b></div>
      <div class="stat"><small>To pay on site</small><b>${money(sum(onSite))}</b></div>
      <div class="stat"><small>Still to book</small><b>${open.length + missing.length}</b></div>
    </div>
    <div class="card settle">${esc(t1)} paid <b>${money(p1)}</b> · ${who(t2)} paid <b>${money(p2)}</b><br>${settle}</div>
    <select class="filter" id="bfilter">
      <option value="open">⚠️ Still to book</option><option value="onsite">💵 Pay on site</option>
      <option value="deadlines">⏳ Cancellation deadlines</option><option value="booked">✓ Booked</option><option value="all">All</option>
    </select>
    <div class="card" style="padding:0 12px">${list || `<div class="empty">${filter === 'open' ? 'Nothing left to book 🎉' : 'Nothing here'}</div>`}</div>
    <p class="muted" style="font-size:12px;text-align:center">Amounts in ${home()} at the rates in the sheet's Settings tab.</p>`;
  const sel = $('#bfilter'); sel.value = filter;
  sel.onchange = () => { LS.set('bFilter', sel.value); renderBookings(); };
  if (allDone && LS.get('celebrated') !== '1') { LS.set('celebrated', '1'); rain(['🎉', '🌼', '✨', '🛺'], 36); }
}

/* ---------- Map ---------- */
function renderMap(arg) {
  const sel = $('#map-select');
  sel.innerHTML = `<option value="">Whole trip</option>` + days().map(d => `<option value="${d.date}">${fmtDay(d.date)} · ${esc(d.location || '')}</option>`).join('');
  sel.value = arg || '';
  const pt = $('#places-toggle'); pt.checked = LS.get('showPlaces') === '1';
  if (!map) {
    map = L.map('map', { zoomControl: false }).setView([15, 78], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    mapLayer = L.layerGroup().addTo(map);
    sel.onchange = () => { location.hash = sel.value ? 'map/' + sel.value : 'map'; };
    pt.onchange = () => { LS.set('showPlaces', pt.checked ? '1' : '0'); drawMap(sel.value); };
  }
  setTimeout(() => { map.invalidateSize(); drawMap(arg || ''); }, 30);
}
function marker(it, emoji, color, cls = '') {
  const icon = L.divIcon({ className: '', html: `<div class="pin-marker ${cls}" style="--c:${color}">${emoji}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
  const link = mapsLink(it);
  const when = it.date ? `${fmtDay(it.date)}${it.time ? ' · ' + esc(it.time) : ''}<br>` : it.list ? `⭐ ${esc(it.list)}<br>` : '';
  return L.marker([num(it.lat), num(it.lng)], { icon }).bindPopup(`<b>${esc(it.title || it.name)}</b><br>${when}${it.note ? esc(it.note) + '<br>' : ''}${link ? `<a class="btn primary" href="${esc(link)}" target="_blank" rel="noopener">Open in Google Maps</a>` : ''}`);
}
function drawMap(iso) {
  mapLayer.clearLayers();
  const css = getComputedStyle(document.documentElement);
  const color = d => (d && countryOf(d) === 'Sri Lanka') ? css.getPropertyValue('--lanka') : css.getPropertyValue('--india');
  let its;
  if (iso) {
    its = [stayFor(addDays(iso, -1)), ...itemsOn(iso), stayFor(iso)].filter((v, i, a) => v && a.indexOf(v) === i);
  } else {
    its = stays();
    const route = stays().filter(hasGeo).sort((a, b) => a.date.localeCompare(b.date)).map(s => [num(s.lat), num(s.lng)]);
    if (route.length > 1) L.polyline(route, { color: color(today()), weight: 3, opacity: .6, dashArray: '6 8' }).addTo(mapLayer);
  }
  const pts = [];
  its.filter(hasGeo).forEach(it => { marker(it, EMOJI[it.type] || '📍', color(it.date)).addTo(mapLayer); pts.push([num(it.lat), num(it.lng)]); });
  if ($('#places-toggle').checked) D.places.filter(hasGeo).forEach(p => marker(p, '⭐', '#C9A227', 'place').addTo(mapLayer));
  if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
  else if (pts.length === 1) map.setView(pts[0], 14);
  else if (iso) toast('No locations with coordinates for this day');
}

// Now and then a single petal drifts across the overview
setInterval(() => {
  if (document.hidden || (location.hash && location.hash !== '#days') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const p = document.createElement('span'); p.className = 'petal drift';
  p.textContent = ['🌸', '🌼', '🍃'][Math.floor(Math.random() * 3)];
  p.style.left = 10 + Math.random() * 70 + 'vw';
  document.body.appendChild(p); setTimeout(() => p.remove(), 12000);
}, 15000);

/* ---------- start ---------- */
const cached = LS.get('data');
if (!DEMO && cached) { try { applyData(JSON.parse(cached)); } catch (e) {} }
else route();
load();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
