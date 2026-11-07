/* Sunny's Sunshine Catch – hidden mini-game (tap the title 7× quickly).
   Drag the sun to catch mangoes, coconuts & chai. Dodge the monsoon clouds. */
(() => {
'use strict';
const GOOD = [['🥭', 1], ['🥥', 1], ['🌼', 1], ['🍵', 2], ['🍍', 1]];
const RARE = ['🛺', 5];
const BAD = ['🌧️', '⛈️'];
const BEST_KEY = 'sunnyBest';
const best = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; } };

const css = `
#sg { position: fixed; inset: 0; z-index: 95; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none;
  background: linear-gradient(180deg, #8FD3F4 0%, #FFE9B8 62%, #FFC8A2 100%); font-family: -apple-system, system-ui, sans-serif; color: #3B2A1A; }
@media (prefers-color-scheme: dark) { #sg { background: linear-gradient(180deg, #3A5A86 0%, #B9785A 70%, #E79A6C 100%); color: #FFF5E6; } }
#sg .hud { position: absolute; top: calc(env(safe-area-inset-top) + 10px); left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 18px; z-index: 3; }
#sg .x { border: 0; background: rgba(255,255,255,.55); width: 38px; height: 38px; border-radius: 50%; font-size: 18px; color: inherit; }
#sg .sun { position: absolute; bottom: calc(env(safe-area-inset-bottom) + 70px); font-size: 58px; transform: translateX(-50%); transition: filter .2s; filter: drop-shadow(0 0 14px rgba(255,200,40,.9)); z-index: 2; }
#sg .sun.hit { filter: grayscale(1) drop-shadow(0 0 4px rgba(0,0,0,.3)); animation: sgshake .35s; }
#sg .sun.yum { animation: sgpulse .25s; }
#sg .drop { position: absolute; top: 0; font-size: 34px; transform: translate(-50%, -50%); will-change: transform; }
#sg .pop { position: absolute; font-weight: 800; font-size: 20px; pointer-events: none; animation: sgup .7s ease-out forwards; z-index: 3; }
#sg .hill { position: absolute; left: -10%; right: -10%; bottom: -40px; height: 120px; border-radius: 50% 50% 0 0; background: #7CC08A; opacity: .65; }
#sg .hill.b { bottom: -60px; left: 30%; right: -30%; background: #5AAE7A; }
#sg .palm { position: absolute; bottom: 40px; font-size: 54px; opacity: .8; }
#sg .cloud-deco { position: absolute; font-size: 44px; opacity: .55; animation: sgcloud 28s linear infinite; }
#sg .card { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); width: min(320px, 86vw); text-align: center; z-index: 4;
  background: rgba(255,255,255,.88); color: #3B2A1A; border-radius: 22px; padding: 22px 18px; box-shadow: 0 10px 40px rgba(120,60,0,.25); animation: sgin .4s cubic-bezier(.3,1.5,.5,1); }
#sg .card h2 { font: 700 26px/1.15 'Fraunces', Georgia, serif; margin: 6px 0; }
#sg .card p { margin: 6px 0 14px; font-size: 15px; color: #7A6450; }
#sg .card .big { font-size: 56px; animation: sgfloat 3s ease-in-out infinite; }
#sg .card button { border: 0; border-radius: 14px; padding: 12px 22px; font-weight: 700; font-size: 16px; background: #EE7D1A; color: #fff; margin: 4px; }
#sg .card button.ghost { background: #F3EBDF; color: #3B2A1A; }
@keyframes sgshake { 25% { margin-left: -10px; } 75% { margin-left: 10px; } }
@keyframes sgpulse { 50% { font-size: 70px; } }
@keyframes sgup { to { transform: translateY(-50px); opacity: 0; } }
@keyframes sgin { from { transform: translate(-50%, -50%) scale(.7); opacity: 0; } }
@keyframes sgfloat { 50% { transform: translateY(-8px) rotate(8deg); } }
@keyframes sgcloud { from { transform: translateX(-30vw); } to { transform: translateX(130vw); } }`;

let root, sun, hud, raf, state;

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

function open() {
  if (root) return;
  if (!document.getElementById('sg-css')) { const s = el('style'); s.id = 'sg-css'; s.textContent = css; document.head.appendChild(s); }
  root = el('div'); root.id = 'sg';
  root.innerHTML = `
    <div class="cloud-deco" style="top:14%">☁️</div><div class="cloud-deco" style="top:30%;animation-delay:-14s">☁️</div>
    <div class="hill"></div><div class="hill b"></div><div class="palm" style="left:4%">🌴</div><div class="palm" style="right:6%;font-size:42px">🌴</div>
    <div class="hud"><span id="sg-score"></span><span id="sg-lives"></span><button class="x" aria-label="Close">✕</button></div>`;
  sun = el('div', 'sun', '🌞'); root.appendChild(sun);
  document.body.appendChild(root);
  hud = { score: root.querySelector('#sg-score'), lives: root.querySelector('#sg-lives') };
  root.querySelector('.x').onclick = close;
  const move = e => { if (!state) return; const x = (e.touches ? e.touches[0].clientX : e.clientX); state.x = Math.max(30, Math.min(innerWidth - 30, x)); };
  root.addEventListener('pointermove', move); root.addEventListener('pointerdown', move);
  root.addEventListener('touchmove', e => { e.preventDefault(); move(e); }, { passive: false });
  document.addEventListener('visibilitychange', onHide);
  intro();
}

function card(html) { const c = el('div', 'card', html); root.appendChild(c); return c; }

function intro() {
  sun.style.left = '50%'; hud.score.textContent = ''; hud.lives.textContent = '';
  const c = card(`<div class="big">🌞</div><h2>Catch the Sunshine</h2>
    <p>Hey Sunny! Slide to catch mangoes, coconuts &amp; chai 🍵 – and stay away from the monsoon clouds 🌧️.<br><b>Best: ${best()}</b></p>
    <button>Play</button>`);
  c.querySelector('button').onclick = () => { c.remove(); start(); };
}

function start() {
  const r = sun.getBoundingClientRect();
  state = { x: innerWidth / 2, sunY: r.top + r.height / 2, score: 0, lives: 3, drops: [], t: 0, last: performance.now(), next: 0, running: true };
  drawHud(); raf = requestAnimationFrame(loop);
}

function drawHud() { hud.score.textContent = `☀️ ${state.score}`; hud.lives.textContent = '❤️'.repeat(state.lives) + '🤍'.repeat(3 - state.lives); }

function spawn() {
  const level = Math.min(state.score / 25, 3);
  const r = Math.random();
  let kind, emoji, pts = 0;
  if (r < 0.04) { kind = 'good'; [emoji, pts] = RARE; }
  else if (r < 0.28 + level * 0.07) { kind = 'bad'; emoji = BAD[Math.floor(Math.random() * BAD.length)]; }
  else { kind = 'good'; [emoji, pts] = GOOD[Math.floor(Math.random() * GOOD.length)]; }
  const d = { kind, pts, x: 30 + Math.random() * (innerWidth - 60), y: -30, v: 150 + Math.random() * 70 + level * 70, sway: Math.random() * 6, node: el('div', 'drop', emoji) };
  root.appendChild(d.node); state.drops.push(d);
}

function popText(x, y, txt, color) {
  const p = el('div', 'pop', txt); p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.color = color;
  root.appendChild(p); setTimeout(() => p.remove(), 700);
}

function loop(now) {
  if (!state || !state.running) return;
  const dt = Math.min((now - state.last) / 1000, 0.05); state.last = now; state.t += dt;
  sun.style.left = state.x + 'px';
  const sunY = state.sunY;
  state.next -= dt;
  if (state.next <= 0) { spawn(); state.next = Math.max(0.32, 0.85 - state.score * 0.01); }
  for (let i = state.drops.length - 1; i >= 0; i--) {
    const d = state.drops[i];
    d.y += d.v * dt; const x = d.x + Math.sin(state.t * 2 + d.sway) * 12;
    d.node.style.transform = `translate(${x}px, ${d.y}px) translate(-50%, -50%)`;
    if (Math.abs(x - state.x) < 44 && Math.abs(d.y - sunY) < 40) {
      if (d.kind === 'good') {
        state.score += d.pts; popText(x, d.y - 20, '+' + d.pts, '#E8730C');
        sun.classList.remove('yum'); void sun.offsetWidth; sun.classList.add('yum');
      } else {
        state.lives--; popText(x, d.y - 20, 'brrr', '#3A6EA5');
        sun.classList.add('hit'); setTimeout(() => sun.classList.remove('hit'), 450);
        if (navigator.vibrate) navigator.vibrate(60);
      }
      drawHud(); d.node.remove(); state.drops.splice(i, 1);
      if (state.lives <= 0) return gameOver();
    } else if (d.y > innerHeight + 40) { d.node.remove(); state.drops.splice(i, 1); }
  }
  raf = requestAnimationFrame(loop);
}

function gameOver() {
  state.running = false; cancelAnimationFrame(raf);
  state.drops.forEach(d => d.node.remove());
  const prev = best(), s = state.score, record = s > prev;
  if (record) { try { localStorage.setItem(BEST_KEY, String(s)); } catch (e) {} }
  const msg = s >= 60 ? 'Sunshine champion! ☀️👑' : s >= 30 ? 'Pure sunshine ✨' : s >= 10 ? 'Warming up nicely 🌤️' : 'Monsoon got you 🌧️';
  const c = card(`<div class="big">${record ? '🏆' : '🌞'}</div><h2>${msg}</h2>
    <p>Score <b>${s}</b>${record ? ' – new best!' : ` · Best ${prev}`}</p>
    <button>Again</button><button class="ghost">Close</button>`);
  const [again, done] = c.querySelectorAll('button');
  again.onclick = () => { c.remove(); start(); };
  done.onclick = close;
  if (record && s > 0) burst();
}

function burst() {
  for (let i = 0; i < 24; i++) {
    const p = el('span', 'petal', ['🌼', '☀️', '✨', '🥭'][i % 4]);
    p.style.cssText = `left:${Math.random() * 100}vw;font-size:${18 + Math.random() * 16}px;animation-duration:${2.5 + Math.random() * 2}s;animation-delay:${Math.random()}s;z-index:96`;
    document.body.appendChild(p); setTimeout(() => p.remove(), 5500);
  }
}

function onHide() { if (document.hidden && state && state.running) { state.running = false; cancelAnimationFrame(raf); const c = card(`<h2>Paused</h2><button>Resume</button>`); c.querySelector('button').onclick = () => { c.remove(); state.running = true; state.last = performance.now(); raf = requestAnimationFrame(loop); }; } }

function close() {
  if (state) state.running = false; cancelAnimationFrame(raf); state = null;
  document.removeEventListener('visibilitychange', onHide);
  root && root.remove(); root = null;
}

window.startSunnyGame = open;
})();
