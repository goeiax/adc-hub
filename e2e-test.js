'use strict';
/* Uji end-to-end ADC Hub: Form 1 -> hub -> Form 2 -> handoff berantai (awal + 2 kontrol).
   Jalan di SALINAN SEMENTARA (server.js + www/) di folder temp — data/ asli tidak tersentuh.
   Pakai:  node e2e-test.js        (Node 18+; jsdom dipasang otomatis ke folder temp, bukan ke repo)
   Jalankan  update-forms.bat  dulu bila form di ..\ baru diedit, supaya www/ ikut terbaru. */
const { spawn, execSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const SRC = __dirname;
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'adc-e2e-'));
const JS_DIR = path.join(os.tmpdir(), 'adc-e2e-jsdom');
if (!fs.existsSync(path.join(JS_DIR, 'node_modules', 'jsdom'))) {
  fs.mkdirSync(JS_DIR, { recursive: true });
  console.log('Memasang jsdom ke ' + JS_DIR + ' ...');
  execSync('npm init -y && npm i jsdom', { cwd: JS_DIR, stdio: 'ignore' });
}
const { JSDOM, VirtualConsole } = require(path.join(JS_DIR, 'node_modules', 'jsdom'));
fs.copyFileSync(path.join(SRC, 'server.js'), path.join(WORK, 'server.js'));
fs.cpSync(path.join(SRC, 'www'), path.join(WORK, 'www'), { recursive: true });
fs.writeFileSync(path.join(WORK, 'config.json'), JSON.stringify({ port: 3791, key: 'adc-test', webhook: 'https://hook.test/adc', backup_dir: path.join(WORK, 'backup'), backup_jam: 1 }));
/* NeoSoft tiruan (mock) — hub menjawab identitas by RM tanpa database */
fs.writeFileSync(path.join(WORK, 'neosoft.json'), JSON.stringify({ mock: { 'RM-NEO-01': { nama: 'Pasien NeoSoft', nik: '3273019900000001', tgl_lahir: '1990-05-17', kelamin: 'P', wa: '081277770001', kota: 'Bandung' } } }));
/* pengguna uji (users.json dibaca server saat start; PIN di-hash scrypt seperti tools/pengguna.js) */
const crypto = require('crypto');
const PIN = { admin: '111111', dokter: '222222', perawat: '333333', cs: '444444' };
fs.writeFileSync(path.join(WORK, 'users.json'), JSON.stringify({ users: Object.keys(PIN).map(id => { const salt = crypto.randomBytes(8).toString('hex');
  return { id, nama: { admin: 'Pimpinan Uji', dokter: 'dr. Uji, Sp.DVE', perawat: 'Perawat Uji', cs: 'CS Uji' }[id], peran: id, salt, hash: crypto.scryptSync(PIN[id], salt, 32).toString('hex'), aktif: true }; }) }));
process.chdir(WORK);

const BASE = 'http://localhost:3791', KEY = 'adc-test', RM = 'RM-TEST-001';
const TOK = {}, USER = {};
const Hd = (u, json) => Object.assign({ 'X-ADC-Key': KEY }, u ? { 'X-ADC-Token': TOK[u] } : {}, json ? { 'Content-Type': 'application/json' } : {});
async function login(id) { const r = await fetch(BASE + '/api/login', { method: 'POST', headers: Hd(null, true), body: JSON.stringify({ id, pin: PIN[id] }) }); const j = await r.json(); if (j.ok) { TOK[id] = j.token; USER[id] = j.user; } return j; }
/* data/ terenkripsi (AES-256-GCM, kunci data_key di config.json yang dilengkapi server) */
function dataKey() { return Buffer.from(JSON.parse(fs.readFileSync(path.join(WORK, 'config.json'), 'utf8')).data_key, 'hex'); }
function dekrip(txt) { const env = JSON.parse(txt); if (!env || env.enc !== 'aes-256-gcm') return env; const d = crypto.createDecipheriv('aes-256-gcm', dataKey(), Buffer.from(env.iv, 'base64')); d.setAuthTag(Buffer.from(env.tag, 'base64')); return JSON.parse(Buffer.concat([d.update(Buffer.from(env.ct, 'base64')), d.final()]).toString('utf8')); }
function enkrip(obj) { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', dataKey(), iv); const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]); return JSON.stringify({ enc: 'aes-256-gcm', iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') }); }
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + (detail === undefined ? '' : JSON.stringify(detail)))); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 4000) { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(50); } return false; }

async function open(file, { key = KEY, user = (/Form2/.test(file) ? 'dokter' : 'perawat'), log, ls } = {}) {
  const dialogs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => dialogs.push({ type: 'jsdomError', msg: String(e.message).slice(0, 200) }));
  const dom = new JSDOM(fs.readFileSync(path.join('www', file), 'utf8'), { url: BASE + '/' + file, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = (u, o) => fetch(u, o);
      w.alert = m => dialogs.push({ type: 'alert', msg: String(m) });
      w.confirm = m => { dialogs.push({ type: 'confirm', msg: String(m) }); return true; };
      w.prompt = (m, d) => { dialogs.push({ type: 'prompt', msg: String(m) }); return w.__promptAns !== undefined ? w.__promptAns : d; };
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { dialogs.push({ type: 'download', msg: this.download }); };
      w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
      w.__popup = null;
      w.open = () => { const d = { html: '', open() {}, write(h) { d.html += h; }, close() {} }; w.__popup = { document: d }; return w.__popup; };
      try { w.localStorage.setItem('adc_hub_key', key); if (user && TOK[user]) { w.localStorage.setItem('adc_hub_tok', TOK[user]); w.localStorage.setItem('adc_hub_user', JSON.stringify(USER[user])); } if (ls) Object.keys(ls).forEach(k => w.localStorage.setItem(k, ls[k])); } catch (e) {}
    } });
  const w = dom.window;
  if (/admin\.html$/.test(file)) { await until(() => w._adminSiap === true, 4000).catch(() => {}); return { w, d: w.document, dialogs, dom }; }
  await until(() => typeof w.hubPing === 'function' && w._hubOn === true && (!user || key !== KEY || w._hubUser), 4000).catch(() => {});
  return { w, d: w.document, dialogs, dom };
}
const $ = (d, id) => d.getElementById(id);
function set(d, id, v) { const e = $(d, id); if (!e) throw new Error('id tidak ada: ' + id); e.value = v; e.dispatchEvent(new e.ownerDocument.defaultView.Event('input', { bubbles: true })); }
function chk(d, id, v = true) { const e = $(d, id); if (!e) throw new Error('id tidak ada: ' + id); e.checked = v; e.dispatchEvent(new e.ownerDocument.defaultView.Event('change', { bubbles: true })); }
function disk(p, rm = RM) { try { return dekrip(fs.readFileSync(path.join('data', rm, p), 'utf8')); } catch (e) { return null; } }
/* Sign-off dokter: mencentang d8_signoff membuka dialog TTD (PIN) bila hub hidup; isi PIN atau Batal */
async function signoff(x, { pin = PIN.dokter, batal = false } = {}) {
  chk(x.d, 'd8_signoff');
  const dlg = await until(() => { const b = x.d.getElementById('ldlg'); return b && b.classList.contains('on'); }, 1200);
  if (dlg) { if (batal) x.d.getElementById('ldlg_x').click(); else { x.d.getElementById('ldlg_pin').value = pin; x.d.getElementById('ldlg_ok').click(); await until(() => x.w._ttd, 3000); } }
  return dlg;
}
/* Terbitkan Handoff: bila dialog TTD (PIN dokter) muncul, isi PIN (atau Batal), lalu tunggu hasil hub di d8_status */
async function terbit(x, { pin = PIN.dokter, batal = false } = {}) {
  x.w.issueHandoff();
  const tdOn = () => { const b = x.d.getElementById('tdlg'); return b && b.classList.contains('on'); };
  const td = await until(tdOn, 1200);
  x.w.__tdlgJudul = td ? x.d.getElementById('tdlg_t').textContent : ''; x.w.__tdlgUlang = '';
  if (td) x.d.getElementById('tdlg_ok').click();
  const dlg = await until(() => { const b = x.d.getElementById('ldlg'); return b && b.classList.contains('on'); }, 1200);
  if (dlg) {
    if (batal) { x.d.getElementById('ldlg_x').click();
      const td2 = await until(tdOn, 1200);
      if (td2) { x.w.__tdlgUlang = x.d.getElementById('tdlg_t').textContent + ' ' + x.d.getElementById('tdlg_miss').textContent; x.d.getElementById('tdlg_ok').click(); } }
    else { x.d.getElementById('ldlg_pin').value = pin; x.d.getElementById('ldlg_ok').click(); }
  }
  await until(() => /✓|✗/.test(x.d.getElementById('d8_status').value), 4000);
  return dlg;
}
function muatRM(x, fn, rm) { x.w[fn](); const i = x.d.getElementById('mdlg_rm'); i.value = rm; x.d.getElementById('mdlg_ok').click(); }
const lastDlg = (s, t) => s.dialogs.filter(x => !t || x.type === t).slice(-1)[0];

(async () => {
  fs.rmSync('data', { recursive: true, force: true });
  const srv = spawn(process.execPath, ['server.js'], { cwd: WORK, stdio: 'ignore' });
  await sleep(800);
  try {
    /* ===== 0. hub dasar ===== */
    const ping = await (await fetch(BASE + '/api/ping')).json();
    check('hub: /api/ping', ping.ok === true);
    check('hub: tanpa kunci -> 401', (await fetch(BASE + '/api/pasien')).status === 401);
    check('hub: path traversal ditolak', [403, 404].includes((await fetch(BASE + '/..%2f..%2fserver.js')).status));
    check('hub: ping mengumumkan login wajib (versi 2)', ping.login === true && ping.versi === 2, ping);
    { const r = await fetch(BASE + '/api/pasien', { headers: Hd() }); const j = await r.json();
      check('hub: kunci benar tanpa token -> 401 error "login"', r.status === 401 && j.error === 'login', j); }
    check('hub: PIN salah -> 401', (await fetch(BASE + '/api/login', { method: 'POST', headers: Hd(null, true), body: JSON.stringify({ id: 'dokter', pin: '000000' }) })).status === 401);
    for (const u of Object.keys(PIN)) await login(u);
    check('hub: login 4 peran berhasil (token + user)', Object.keys(TOK).length === 4 && USER.dokter.peran === 'dokter' && USER.dokter.nama === 'dr. Uji, Sp.DVE', USER);
    check('hub: /api/saya mengenali sesi', (await (await fetch(BASE + '/api/saya', { headers: Hd('perawat') })).json()).user.id === 'perawat');
    check('hub: RM tak dikenal -> 404', (await fetch(BASE + '/api/pasien/NOPE', { headers: Hd('perawat') })).status === 404);
    check('hub: CS boleh lihat daftar, TIDAK boleh simpan intake (403)', (await fetch(BASE + '/api/pasien', { headers: Hd('cs') })).status === 200 &&
      (await fetch(BASE + '/api/intake', { method: 'POST', headers: Hd('cs', true), body: JSON.stringify({ doc: 'ADC-INTAKE', pasien: { rm: 'RM-CS' } }) })).status === 403);
    /* NeoSoft (mock): ping mengumumkan, endpoint by RM, 404 untuk RM asing, butuh sesi */
    check('NeoSoft: /api/ping mengumumkan neosoft:true (mock terpasang)', ping.neosoft === true, ping);
    { const r = await fetch(BASE + '/api/neosoft/RM-NEO-01', { headers: Hd('perawat') }); const j = await r.json();
      const r404 = await fetch(BASE + '/api/neosoft/RM-ASING', { headers: Hd('cs') });
      const r401 = await fetch(BASE + '/api/neosoft/RM-NEO-01', { headers: Hd() });
      check('NeoSoft: GET /api/neosoft/:rm -> identitas ternormalisasi (kelamin P -> Perempuan); RM asing 404; tanpa sesi 401', r.status === 200 && j.ok && j.sumber === 'neosoft' && j.pasien.nama === 'Pasien NeoSoft' && j.pasien.kelamin === 'Perempuan' && j.pasien.rm === 'RM-NEO-01' && r404.status === 404 && r401.status === 401, { s: r.status, j, r404: r404.status, r401: r401.status }); }
    /* Tahap 0 akses luar: CORS, alamat perangkat di balik proxy lokal, pembatasan percobaan PIN */
    { const ac = async (origin) => (await fetch(BASE + '/api/ping', { headers: origin ? { Origin: origin } : {} })).headers.get('access-control-allow-origin');
      check('CORS: asal asing tidak diberi izin; asal = hub sendiri, berkas lokal ("null") dan localhost diizinkan; tanpa Origin tanpa header', (await ac('https://situs-lain.example')) === null && (await ac(BASE)) === BASE && (await ac('null')) === 'null' && (await ac('http://localhost:5500')) === 'http://localhost:5500' && (await ac('')) === null && (await ac('http://192.168.111.74:3777')) === 'http://192.168.111.74:3777' && (await ac('http://adc-hub.lan:3777')) === 'http://adc-hub.lan:3777' && (await ac('https://adc-hub.tail1a2b.ts.net')) === 'https://adc-hub.tail1a2b.ts.net' && (await ac('https://192.168.evil.example')) === null, [await ac('https://situs-lain.example'), await ac(BASE), await ac('null')]); }
    { await fetch(BASE + '/api/pasien', { headers: Object.assign(Hd('perawat'), { 'X-Forwarded-For': '100.64.0.7, 10.0.0.1' }) });
      await fetch(BASE + '/api/login', { method: 'POST', headers: Object.assign(Hd(null, true), { 'X-Forwarded-For': '100.64.0.9' }), body: JSON.stringify({ id: 'perawat', pin: '999999' }) });
      const au = (await (await fetch(BASE + '/api/audit?n=50', { headers: Hd('admin') })).json()).audit;
      check('Audit di balik proxy lokal: X-Forwarded-For dipakai sebagai alamat perangkat (soket loopback)', au.some(r => r.aksi === 'login_gagal' && r.ip === '100.64.0.9'), au.filter(r => r.aksi === 'login_gagal').map(r => r.ip)); }
    { const xf = { 'X-Forwarded-For': '100.64.0.50' }, coba = (pin, id = 'cs') => fetch(BASE + '/api/login', { method: 'POST', headers: Object.assign(Hd(null, true), xf), body: JSON.stringify({ id, pin }) }).then(async r => ({ s: r.status, j: await r.json() }));
      const st = []; for (let i = 0; i < 9; i++) st.push((await coba('000000')).s);
      const benar = await coba(PIN.cs), lain = await coba(PIN.perawat, 'perawat');
      const dariLain = await fetch(BASE + '/api/login', { method: 'POST', headers: Object.assign(Hd(null, true), { 'X-Forwarded-For': '100.64.0.51' }), body: JSON.stringify({ id: 'cs', pin: PIN.cs }) });
      check('Batas percobaan PIN: 8 kali salah -> percobaan ke-9 ditolak 429, PIN benar pun ditolak selama terkunci; pengguna lain di perangkat itu & pengguna yang sama di perangkat lain tetap bisa masuk', st.slice(0, 8).every(s => s === 401) && st[8] === 429 && benar.s === 429 && /Terlalu banyak percobaan/.test(benar.j.error) && lain.s === 200 && dariLain.status === 200, { st, benar: benar.s, lain: lain.s, dariLain: dariLain.status });
      const reset = await fetch(BASE + '/api/users', { method: 'POST', headers: Hd('admin', true), body: JSON.stringify({ id: 'cs', pin: PIN.cs }) });
      check('Batas percobaan PIN: admin mengatur ulang PIN -> kunci terbuka', reset.status === 200 && (await coba(PIN.cs)).s === 200);
      await login('cs'); }
    check('hub: audit hanya admin (cs 403, admin 200)', (await fetch(BASE + '/api/audit', { headers: Hd('cs') })).status === 403 && (await fetch(BASE + '/api/audit', { headers: Hd('admin') })).status === 200);
    check('hub: cadangan ke backup_dir saat mulai (folder bertanggal + BACA-SAYA)', fs.existsSync(path.join(WORK, 'backup', 'BACA-SAYA.txt')) && fs.readdirSync(path.join(WORK, 'backup')).some(f => /^adc-data-\d{4}-/.test(f)), fs.existsSync(path.join(WORK, 'backup')) ? fs.readdirSync(path.join(WORK, 'backup')) : null);
    { const r = await fetch(BASE + '/api/users', { method: 'POST', headers: Hd('admin', true), body: JSON.stringify({ id: 'dr.baru', nama: 'dr. Baru', peran: 'dokter', pin: '555555' }) });
      const l = await (await fetch(BASE + '/api/login', { method: 'POST', headers: Hd(null, true), body: JSON.stringify({ id: 'dr.baru', pin: '555555' }) })).json();
      const c = await fetch(BASE + '/api/users', { method: 'POST', headers: Hd('cs', true), body: JSON.stringify({ id: 'x', nama: 'x', peran: 'cs', pin: '1234' }) });
      check('hub: admin menambah pengguna lewat API & pengguna baru bisa masuk; cs ditolak', r.status === 200 && l.ok === true && l.user.peran === 'dokter' && c.status === 403, { r: r.status, l, c: c.status });
      /* dashboard pengguna: ubah peran / PIN / aktif lewat POST yang sama; pagar akun sendiri & admin terakhir */
      const pu = (b, u = 'admin') => fetch(BASE + '/api/users', { method: 'POST', headers: Hd(u, true), body: JSON.stringify(b) }).then(async x => Object.assign(await x.json().catch(() => ({})), { _s: x.status }));
      const lg = (id, pin) => fetch(BASE + '/api/login', { method: 'POST', headers: Hd(null, true), body: JSON.stringify({ id, pin }) }).then(x => x.status);
      const g0 = await (await fetch(BASE + '/api/users', { headers: Hd('admin') })).json();
      check('users GET: daftar memuat aktif/dibuat + "saya" = admin yang masuk', g0.saya === 'admin' && g0.users.some(x => x.id === 'dr.baru' && x.aktif === true && x.dibuat), g0);
      const p1 = await pu({ id: 'dr.baru', peran: 'perawat' });
      const sesiLama = await fetch(BASE + '/api/saya', { headers: Object.assign(Hd(), { 'X-ADC-Token': l.token }) });
      check('users: ganti peran dr.baru -> perawat; sesi lamanya ditutup (401)', p1.ok === true && p1.ubah.includes('peran=perawat') && sesiLama.status === 401 && (await (await fetch(BASE + '/api/users', { headers: Hd('admin') })).json()).users.find(x => x.id === 'dr.baru').peran === 'perawat', { p1, s: sesiLama.status });
      const p2 = await pu({ id: 'dr.baru', pin: '666666' });
      check('users: atur ulang PIN -> PIN lama 401, PIN baru 200', p2.ok === true && (await lg('dr.baru', '555555')) === 401 && (await lg('dr.baru', '666666')) === 200, p2);
      const p3 = await pu({ id: 'dr.baru', aktif: false });
      const p4 = await pu({ id: 'dr.baru', aktif: true });
      check('users: nonaktif -> login 401; aktif lagi -> 200', p3.ok === true && p3.ubah.includes('nonaktif') && (await lg('dr.baru', '666666')) === 200 && p4.ok === true, { p3, p4 });
      const sendiri = await pu({ id: 'admin', aktif: false }), turun = await pu({ id: 'admin', peran: 'cs' }), idJelek = await pu({ id: 'Dr Baru!', nama: 'x', peran: 'cs', pin: '1234' }), kosong = await pu({ id: 'dr.baru' });
      check('users: pagar — akun sendiri tidak bisa dinonaktifkan/diturunkan (400), id tidak valid 400, tanpa perubahan 400', sendiri._s === 400 && turun._s === 400 && idJelek._s === 400 && kosong._s === 400, { sendiri, turun, idJelek, kosong });
      check('users: nonaktif dr.baru berhasil dipulihkan (login 200 setelah p4)', (await lg('dr.baru', '666666')) === 200);
      /* halaman admin.html: tersaji, gerbang peran, render daftar */
      check('admin.html tersaji oleh hub + kartu di index', (await fetch(BASE + '/admin.html')).status === 200 && /href="admin.html"/.test(fs.readFileSync(path.join('www', 'index.html'), 'utf8')));
      { const ad = await open('admin.html', { user: 'admin' });
        const rows = [...ad.d.querySelectorAll('#rows .u')].map(x => x.dataset.id);
        const segPer = ad.d.querySelector('.u[data-id="dr.baru"] .seg button[data-peran="perawat"]');
        check('admin.html (admin): aplikasi tampil, baris pengguna dirender, akun sendiri ditandai "Anda", peran dr.baru = perawat (aria-pressed)', !ad.d.getElementById('app').hidden && rows.includes('dr.baru') && !!ad.d.querySelector('.u[data-id="admin"] .me') && !!segPer && segPer.getAttribute('aria-pressed') === 'true', { rows, app: ad.d.getElementById('app').hidden, gates: ['gate_key', 'gate_login', 'gate_role'].filter(g => !ad.d.getElementById(g).hidden), toast: ad.d.getElementById('toast').textContent, dialogs: ad.dialogs.slice(0, 3) });
        check('admin.html: tombol & target >= 44 px (CSS) dan kolom PIN/ID memakai label', /\.btn\{[^}]*min-height:44px/.test(fs.readFileSync(path.join('www', 'admin.html'), 'utf8')) && /\.seg button\{[^}]*min-height:44px/.test(fs.readFileSync(path.join('www', 'admin.html'), 'utf8')) && !!ad.d.querySelector('label[for="f_pin"]') && !!ad.d.querySelector('label[for="l_id"]'));
        const segDok = () => { const b = ad.d.querySelector('.u[data-id="dr.baru"] .seg button[data-peran="dokter"]'); return b ? b.getAttribute('aria-pressed') : null; };
        if (typeof ad.w.ubahPeran === 'function') ad.w.ubahPeran('dr.baru', 'dokter'); await until(() => segDok() === 'true', 3000).catch(() => {});
        check('admin.html: ketuk peran -> POST /api/users -> daftar dimuat ulang (dr.baru kembali dokter)', segDok() === 'true' && (await (await fetch(BASE + '/api/users', { headers: Hd('admin') })).json()).users.find(x => x.id === 'dr.baru').peran === 'dokter', { seg: segDok() }); }
      { const cs = await open('admin.html', { user: 'cs' });
        check('admin.html (cs): gerbang "Hanya untuk admin", aplikasi tersembunyi', !cs.d.getElementById('gate_role').hidden && cs.d.getElementById('app').hidden && /bukan|hanya/i.test(cs.d.getElementById('role_msg').textContent)); }
      { const no = await open('admin.html', { user: null });
        check('admin.html (tanpa sesi): gerbang masuk tampil', !no.d.getElementById('gate_login').hidden && no.d.getElementById('app').hidden); } }

    /* ===== 1. FORM 1: isi + simpan intake ===== */
    const f1 = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html');
    check('F1: halaman termuat & hub tersambung', f1.w._hubOn === true, f1.dialogs.filter(x => x.type === 'jsdomError'));
    set(f1.d, 'p_nama', 'Pasien Uji Coba'); set(f1.d, 'rm', RM); set(f1.d, 'p_wa', '081234567890');
    check('F1: chip HUB menampilkan pengguna yang masuk', /Perawat Uji/.test($(f1.d, 'hubchip').textContent) && $(f1.d, 'hubchip').classList.contains('on'), $(f1.d, 'hubchip').textContent);
    { const nik = $(f1.d, 'p_nik'); nik.value = '3273-0123'; f1.w.cekNIK(nik); check('F1: NIK hanya angka & ditandai merah bila bukan 16 digit', nik.value === '32730123' && nik.style.borderColor !== '', { v: nik.value, b: nik.style.borderColor }); }
    set(f1.d, 'p_nik', '3273012345678901'); f1.w.cekNIK($(f1.d, 'p_nik'));
    check('F1 P6: kotak hak & kewajiban + 7 butir persetujuan (hak, umum, PDP)', !!f1.d.querySelector('.hk') && f1.d.querySelectorAll('label.ack').length === 7 && ['hak', 'umum', 'pdp'].every(k => f1.d.querySelector('label.ack[data-k="' + k + '"]')), f1.d.querySelectorAll('label.ack').length);
    set(f1.d, 'p_dokter', 'dr. Uji, Sp.DVE'); chk(f1.d, 'p_foto_ok'); chk(f1.d, 'p_foto_izin'); set(f1.d, 'p_foto_area', 'Wajah');
    set(f1.d, 'p_bb', '58'); set(f1.d, 'p_tb', '160'); set(f1.d, 'alergi', 'Penisilin');
    f1.d.querySelectorAll('label.ack input').forEach(c => { c.checked = true; });
    { const pc = f1.d.querySelector('.prog[data-p=acne] input'); pc.checked = true; f1.w.tog('acne');
      const lok = [...f1.d.querySelectorAll('#d-acne label.opt')].find(l => l.textContent.trim() === 'Pipi'); lok.querySelector('input').checked = true; }
    { const labs = [...f1.d.querySelectorAll('.lab')].map(l => l.textContent.trim());
      check('F1: pertanyaan ganda dihapus (BB/TB di Slimming, Masih menyusui, Haid tidak teratur) & label onset rambut unik',
        !labs.includes('Berat badan sekarang') && !labs.includes('Tinggi badan') && !labs.includes('Masih menyusui?') &&
        !/Haid tidak teratur/.test(f1.d.getElementById('d-slimming').textContent) && labs.filter(l => l === 'Sejak kapan?').length === 1 && labs.includes('Rontok sejak kapan?'), labs.filter(l => /Sejak|Berat|menyusui/i.test(l))); }
    { const pilih = (lab, teks) => { const fx = [...f1.d.querySelectorAll('.page .f')].find(x => ((x.querySelector('.lab') || {}).textContent || '').trim().startsWith(lab)); const l = fx && [...fx.querySelectorAll('label.opt')].find(l => l.textContent.trim() === teks); if (l) l.querySelector('input').checked = true; return !!l; };
      const p5 = [...f1.d.querySelectorAll('.step[data-step="3"] .f')];
      const okPilih = pilih('Tidur', '7–8 jam') && pilih('Susu', 'Tiap hari') && pilih('Pola makan', 'Sering gorengan') && pilih('Pola makan', 'Makan malam larut') && pilih('Suplemen rutin', 'Whey / protein'); const gh = f1.w.buildIntake().gaya_hidup;
      check('F1 P5: 12 pertanyaan gaya hidup, semuanya pilihan (chip centang); pilihan terbaca buildIntake', p5.length === 12 && p5.every(x => x.querySelectorAll('label.opt input[type=checkbox]').length >= 3) && okPilih && gh.tidur === '7–8 jam' && gh.susu === 'Tiap hari' && gh.pola_makan === 'Sering gorengan · Makan malam larut' && gh.suplemen === 'Whey / protein', { n: p5.length, gh }); }
    f1.w.simpanIntake();
    const c1 = lastDlg(f1, 'confirm');
    check('F1: dialog "belum lengkap" hanya soal tanda tangan (canvas tak ada di jsdom)', !c1 || /tanda tangan/i.test(c1.msg) && (c1.msg.match(/·/g) || []).length === 1, c1 && c1.msg);
    check('F1: unduhan cadangan dibuat', f1.dialogs.some(x => x.type === 'download' && /^Intake_/.test(x.msg)), f1.dialogs);
    await until(() => f1.dialogs.some(x => x.type === 'alert' && /tersimpan di hub/.test(x.msg)));
    check('F1: pesan Simpan menyebut hub ✓ + RM (bukan pesan generik)', f1.dialogs.some(x => x.type === 'alert' && /✓.*tersimpan di hub klinik \(RM RM-TEST-001\)/.test(x.msg)), f1.dialogs.filter(x => x.type === 'alert').map(x => x.msg.slice(0, 80)));
    check('F1: tombol Simpan juga ada di akhir langkah 5', !!f1.d.querySelector('.donehint button[onclick="simpanIntake()"]'));
    /* ===== 1a. FORM 1: identitas dari NeoSoft saat RM diisi ===== */
    { const fn = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html');
      await until(() => fn.w._neoOn === true, 3000).catch(() => {});
      set(fn.d, 'p_wa', '0800-sudah-diketik');
      set(fn.d, 'rm', 'RM-NEO-01'); $(fn.d, 'rm').dispatchEvent(new fn.w.Event('change', { bubbles: true }));
      await until(() => $(fn.d, 'p_nama').value === 'Pasien NeoSoft', 4000).catch(() => {});
      const lab = (pref) => { let v = ''; fn.d.querySelectorAll('.page .f').forEach(f => { const k = (f.querySelector('.lab') || {}).textContent || ''; if (!v && k.trim().toLowerCase().startsWith(pref)) v = fn.w._fval(f); }); return v; };
      check('F1 NeoSoft: RM diisi -> nama, NIK, tanggal lahir, jenis kelamin, kota terisi dari NeoSoft; WA yang sudah diketik tidak ditimpa; catatan "identitas dari NeoSoft"', $(fn.d, 'p_nama').value === 'Pasien NeoSoft' && $(fn.d, 'p_nik').value === '3273019900000001' && $(fn.d, 'p_wa').value === '0800-sudah-diketik' && lab('tanggal lahir') === '17/05/1990' && lab('jenis kelamin') === 'Perempuan' && lab('kota') === 'Bandung' && /identitas dari NeoSoft/.test($(fn.d, 'rm_neo').textContent), { nama: $(fn.d, 'p_nama').value, tl: lab('tanggal lahir'), jk: lab('jenis kelamin'), kota: lab('kota'), note: $(fn.d, 'rm_neo').textContent });
      set(fn.d, 'rm', 'RM-ASING-9'); $(fn.d, 'rm').dispatchEvent(new fn.w.Event('change', { bubbles: true }));
      await until(() => /tidak ada di NeoSoft/.test($(fn.d, 'rm_neo').textContent), 3000).catch(() => {});
      check('F1 NeoSoft: RM asing -> catatan "tidak ada di NeoSoft", isian tidak berubah', /tidak ada di NeoSoft/.test($(fn.d, 'rm_neo').textContent) && $(fn.d, 'p_nama').value === 'Pasien NeoSoft', $(fn.d, 'rm_neo').textContent); }
    /* ===== 1b. FORM 1: panggil kembali (Muat Form 1 by RM) + draf lokal ===== */
    { await until(() => disk('intake.json')); const ikF1 = disk('intake.json'); const f1b = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html');
      check('F1 muat: tombol "Muat Form 1" di toolbar & draf belum ditawarkan (localStorage kosong)', !!$(f1b.d, 'tb_muat') && $(f1b.d, 'draftbar').hidden);
      f1b.w.muatF1(); await sleep(50);
      check('F1 muat: dialog RM/berkas terbuka (ids mdlg_rm/mdlg_file/mdlg_ok)', $(f1b.d, 'mdlg').classList.contains('on') && !!$(f1b.d, 'mdlg_file') && !!$(f1b.d, 'mdlg_ok'));
      set(f1b.d, 'mdlg_rm', RM); $(f1b.d, 'mdlg_ok').click();
      await until(() => f1b.w._f1Dimuat, 4000).catch(() => {});
      const b2 = f1b.w.buildIntake();
      check('F1 muat: identitas, panel staf & alergi terisi kembali dari hub; dialog tertutup', !!f1b.w._f1Dimuat && $(f1b.d, 'p_nama').value === 'Pasien Uji Coba' && $(f1b.d, 'rm').value === RM && $(f1b.d, 'p_nik').value === '3273012345678901' && $(f1b.d, 'p_dokter').value === 'dr. Uji, Sp.DVE' && $(f1b.d, 'p_bb').value === '58' && $(f1b.d, 'alergi').value === 'Penisilin' && $(f1b.d, 'p_foto_ok').checked && $(f1b.d, 'p_foto_izin').checked && !$(f1b.d, 'mdlg').classList.contains('on'), { nama: $(f1b.d, 'p_nama').value, dlg: $(f1b.d, 'mdlg_msg').textContent, dialogs: f1b.dialogs.slice(-2) });
      check('F1 muat: program Acne kembali terpilih (kartu + blok detail), lokasi "Pipi" tercentang, 7 persetujuan tercentang', f1b.d.querySelector('.prog[data-p=acne]').classList.contains('on') && f1b.d.getElementById('d-acne').classList.contains('on') && [...f1b.d.querySelectorAll('#d-acne label.opt')].some(l => l.textContent.trim() === 'Pipi' && l.querySelector('input').checked) && f1b.d.querySelectorAll('label.ack input:checked').length === 7, { hilang: f1b.w._f1Hilang });
      check('F1 muat: buildIntake() setelah dimuat = intake yang tersimpan (pasien, kritis, program, seksi P4)', JSON.stringify(b2.pasien) === JSON.stringify(ikF1.pasien) && b2.kritis.alergi === ikF1.kritis.alergi && JSON.stringify(b2.kritis.program) === JSON.stringify(ikF1.kritis.program) && JSON.stringify(b2.seksi) === JSON.stringify(ikF1.seksi) && b2.persetujuan.disetujui === ikF1.persetujuan.disetujui, { b2: { p: b2.pasien, s: b2.seksi }, ikF1: { p: ikF1.pasien, s: ikF1.seksi } });
      { const ttd = JSON.parse(JSON.stringify(ikF1)); ttd.persetujuan.tanda_tangan.pasien = { nama: 'Pasien Uji Coba', tanggal: '2026-11-11', gambar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' };
        f1b.w.applyIntakeF1(ttd); const b3 = f1b.w.buildIntake();
        check('F1 muat: gambar tanda tangan dari intake dipertahankan (padData mengembalikannya) & nama penandatangan terisi', b3.persetujuan.tanda_tangan.pasien.gambar === ttd.persetujuan.tanda_tangan.pasien.gambar && $(f1b.d, 'ttd_pasien_nama').value === 'Pasien Uji Coba' && f1b.d.getElementById('ttd_pasien').parentNode.classList.contains('inked'), b3.persetujuan.tanda_tangan.pasien.gambar.slice(0, 30)); }
      await sleep(1500); f1b.w.localStorage.removeItem('adc_f1_draft'); f1b.w.applyIntakeF1(ikF1); await sleep(1300);
      check('F1 muat: memanggil kembali Form 1 tersimpan TIDAK meninggalkan draf pasien itu di perangkat', !f1b.w.localStorage.getItem('adc_f1_draft'), (f1b.w.localStorage.getItem('adc_f1_draft') || '').slice(0, 60));
      check('F1 muat: berkas bukan ADC-INTAKE ditolak', f1b.w.applyIntakeF1({ doc: 'ADC-HANDOFF' }) === false && f1b.dialogs.some(x => x.type === 'alert' && /bukan keluaran Form 1/.test(x.msg)));
      /* draf lokal: perubahan -> localStorage; buka lagi -> bilah Lanjutkan */
      set(f1b.d, 'p_nama', 'Draf Uji'); await until(() => { try { return /Draf Uji/.test(f1b.w.localStorage.getItem('adc_f1_draft') || ''); } catch (e) { return false; } }, 3000).catch(() => {});
      const draf = f1b.w.localStorage.getItem('adc_f1_draft');
      check('F1 draf: perubahan tersimpan otomatis ke localStorage (adc_f1_draft)', !!draf && /Draf Uji/.test(draf));
      { const f1c = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html', { ls: { adc_f1_draft: draf } });
        check('F1 draf: saat dibuka lagi, bilah "Isian terakhir" tampil dengan nama & RM', !$(f1c.d, 'draftbar').hidden && /Draf Uji/.test($(f1c.d, 'draft_teks').textContent) && new RegExp(RM).test($(f1c.d, 'draft_teks').textContent), $(f1c.d, 'draft_teks').textContent);
        $(f1c.d, 'draft_lanjut').click(); await sleep(50);
        check('F1 draf: Lanjutkan mengisi ulang form & menutup bilah', $(f1c.d, 'p_nama').value === 'Draf Uji' && $(f1c.d, 'rm').value === RM && $(f1c.d, 'draftbar').hidden);
        f1c.w.confirm = () => true; f1c.w.resetForm();
        check('F1 draf: Reset menghapus draf', !f1c.w.localStorage.getItem('adc_f1_draft') && $(f1c.d, 'p_nama').value === ''); }
      { const f1d = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html', { ls: { adc_f1_draft: draf } });
        $(f1d.d, 'draft_buang').click();
        check('F1 draf: Buang menghapus draf tanpa mengisi form', !f1d.w.localStorage.getItem('adc_f1_draft') && $(f1d.d, 'draftbar').hidden && $(f1d.d, 'p_nama').value === ''); } }
    await until(() => disk('intake.json'));
    const ikF1 = disk('intake.json');
    check('hub: intake.json tersimpan per RM', ikF1 && ikF1.doc === 'ADC-INTAKE' && ikF1.pasien.rm === RM);
    check('hub: field intake benar (nama, alergi, dokter, BB/TB)', ikF1 && ikF1.pasien.nama === 'Pasien Uji Coba' && ikF1.kritis.alergi === 'Penisilin' && ikF1.penugasan.dokter === 'dr. Uji, Sp.DVE' && ikF1.pengukuran.bb === '58', ikF1 && { p: ikF1.pasien, k: ikF1.kritis.alergi, pg: ikF1.pengukuran });
    check('F1: IMT terhitung', ikF1 && ikF1.pengukuran.imt, ikF1 && ikF1.pengukuran);
    check('F1: NIK & persetujuan (umum, data pribadi, hak-kewajiban) masuk ke intake', ikF1 && ikF1.pasien.nik === '3273012345678901' && ikF1.persetujuan.total === 7 && ikF1.persetujuan.umum === true && ikF1.persetujuan.data_pribadi === true && ikF1.persetujuan.hak_kewajiban === true && ikF1.persetujuan.butir.length === 7, ikF1 && ikF1.persetujuan);
    check('hub: stempel server _audit (siapa/kapan) di intake = perawat', ikF1 && ikF1._audit && ikF1._audit.oleh === 'perawat' && ikF1._audit.peran === 'perawat' && /^\d{4}-/.test(ikF1._audit.waktu), ikF1 && ikF1._audit);
    { const raw = fs.readFileSync(path.join('data', RM, 'intake.json'), 'utf8');
      check('hub: berkas di disk TERENKRIPSI (amplop aes-256-gcm, nama pasien tidak terbaca)', /"enc":"aes-256-gcm"/.test(raw) && !/Pasien Uji Coba/.test(raw)); }

    /* simpan ulang -> versi lama diarsipkan */
    f1.w.simpanIntake(); await sleep(400);
    check('hub: intake ulang mengarsip versi lama', fs.readdirSync(path.join('data', RM)).some(f => /^intake_\d/.test(f)));

    /* ===== 2. FORM 2: muat intake via hub, isi, terbitkan handoff #1 ===== */
    const a = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    check('F2: hub tersambung', a.w._hubOn === true);
    a.w.muatIntakeHub();
    check('F2: dialog Muat Form 1 punya kotak RM + tombol "Pilih berkas…"', a.d.getElementById('mdlg').classList.contains('on') && a.d.getElementById('mdlg_rm').value === '' && /Pilih berkas/.test(a.d.getElementById('mdlg_file').textContent));
    { let k = 0; a.w.HTMLInputElement.prototype.click = function () { if (this.id === '_intakefile') k++; }; a.d.getElementById('mdlg_file').click();
      check('F2: "Pilih berkas…" membuka pemilih berkas & menutup dialog', k === 1 && !a.d.getElementById('mdlg').classList.contains('on'), k); delete a.w.HTMLInputElement.prototype.click; }
    muatRM(a, 'muatIntakeHub', RM);
    await until(() => a.w._intake);
    check('F2: intake termuat dari hub', a.w._intake && a.w._intake.pasien.rm === RM, a.dialogs.slice(-2));
    check('F2: identitas terisi otomatis (termasuk NIK)', $(a.d, 'p_nama').value === 'Pasien Uji Coba' && $(a.d, 'rm').value === RM && $(a.d, 'p_wa').value === '081234567890' && $(a.d, 'p_nik').value === '3273012345678901', $(a.d, 'p_nik').value);
    check('F2 Latar: jawaban gaya hidup baru (Susu, Suplemen) tampil di Ringkasan', /Susu/.test($(a.d, 'intake_body').textContent) && /Whey/.test($(a.d, 'intake_body').textContent) && /7–8 jam/.test($(a.d, 'intake_body').textContent));
    check('F2: ringkasan mencatat izin lisan foto', /izin lisan/.test($(a.d, 'intake_body').textContent));
    check('F2: webhook Make.com terisi otomatis dari hub (config.json)', $(a.d, 'cfg_webhook').value === 'https://hook.test/adc', $(a.d, 'cfg_webhook').value);
    { const wh = $(a.d, 'cfg_webhook'); wh.value = 'https://hook.test/baru'; wh.dispatchEvent(new a.w.Event('change', { bubbles: true }));
      check('F2: webhook diingat per perangkat (localStorage)', a.w.localStorage.getItem('adc_webhook') === 'https://hook.test/baru'); }
    check('F2: alur berakhir di dalam langkah — D5 di langkah 4, sign-off di langkah 5, D4b + Terbitkan di langkah 6', $(a.d, 'd5_iv').closest('.step').getAttribute('data-step') === '3' && a.d.querySelector('.tbl input.cell[value="Sekarang"]').closest('.step').getAttribute('data-step') === '3' && $(a.d, 'd8_signoff').closest('.step').getAttribute('data-step') === '4' && $(a.d, 'schedBody').closest('.step').getAttribute('data-step') === '5' && $(a.d, 'd8_status').closest('.step').getAttribute('data-step') === '5' && a.d.querySelectorAll('#rail button').length === 6, [...a.d.querySelectorAll('#rail button .rl')].map(b => b.textContent));
    check('F2 terbit: kartu selesai tersembunyi sebelum terbit, dialog Terbitkan belum dibuat', $(a.d, 'terbit_done').hidden === true && !a.d.getElementById('tdlg'));
    check('F2: tombol Terbitkan Handoff utama di akhir langkah 6 (bukan "klik di atas"); toolbar bertingkat dengan menu Lainnya berisi Reset', !!a.d.querySelector('.step[data-step="5"] .stepnav .nb-terbit[onclick="issueHandoff()"]') && !a.d.querySelector('.donehint') && a.d.querySelectorAll('.tb-actions > .btn, .tb-actions > .hubchip').length === 3 && !a.d.querySelector('.tb-hint') && !!a.d.querySelector('#tbmenu button[onclick*="cetakSemua"]') && /\.tb-actions \.btn\{white-space:nowrap;min-height:44px;\}/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')) && /body:not\(\.mode-kontrol\) #tb_muatho\{display:none;\}/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')) && !!a.d.querySelector('#tbmenu button[onclick*="resetForm"]') && !a.d.querySelector('.tb-actions > .btn[onclick="resetForm()"]'));
    { a.w.tbMenu(); const open = $(a.d, 'tbmenu').classList.contains('on') && $(a.d, 'tb_more').getAttribute('aria-expanded') === 'true'; a.d.body.click(); check('F2: menu Lainnya buka/tutup (klik luar menutup)', open && !$(a.d, 'tbmenu').classList.contains('on')); }
    check('F2: D1 — Catatan klinis (temuan) di atas Diagnosis', !!($(a.d, 'd2_hasil').compareDocumentPosition($(a.d, 'd2_dx')) & 4));
    check('F2 lipatan: blok temuan (dokter, catatan, diagnosis, IGA) di ATAS baris profil kulit; tanpa pita sub-judul', !!($(a.d, 'd2_dx').compareDocumentPosition($(a.d, 'd1_tk')) & 4) && !!($(a.d, 'igacard_umum').compareDocumentPosition(a.d.querySelector('input[name="d1_fitz"]')) & 4) && !a.d.querySelector('.step[data-step="1"] .dxblk .d1h'));
    check('F2 lipatan: Catatan klinis 3 baris (min-height 92 px)', /textarea\.in#d2_hasil\{min-height:92px;\}/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')) && $(a.d, 'd2_hasil').getAttribute('rows') === '3');
    check('F2 lipatan: Dokter pemeriksa (s3) sebaris dengan Catatan klinis (s9); Fitzpatrick s5 & Tipe kulit s7 sebaris', $(a.d, 'd1_dokter').closest('.row') === $(a.d, 'd2_hasil').closest('.row') && $(a.d, 'd1_dokter').closest('.f').classList.contains('s3') && $(a.d, 'd2_hasil').closest('.f').classList.contains('s9') && a.d.querySelector('input[name="d1_fitz"]').closest('.row') === $(a.d, 'd1_tk').closest('.row') && $(a.d, 'd1_tk').closest('.f').classList.contains('s7'));
    { const css = fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8');
      { const labs = [...a.d.querySelectorAll('label.lab[for]')]; const bad = labs.filter(l => !a.d.getElementById(l.getAttribute('for')));
        check('F2 a11y: isian ber-id punya <label for> (>= 35), semua for valid; rel pakai aria-current; sasaran sentuh >= 44 px di CSS', labs.length >= 35 && bad.length === 0 && !!a.d.querySelector('#rail button[aria-current="step"]') && /\.toolbar \.modebar button\{[^}]*min-height:44px/.test(css) && /\.ctlbar \.reqbar \.it\{[^}]*min-height:44px/.test(css) && /#ovl_acne \.chk-item\{[^}]*min-height:44px/.test(css) && /\.stepnav \.nb\{[^}]*min-height:44px/.test(css) && /\.igaseg button em\{font-size:12px/.test(css), { labs: labs.length, bad: bad.map(l => l.getAttribute('for')) }); }
      check('F2 typeset: kartu tahap acne bertag "Tahap 1–4" (bukan ulang nama), tanggal ritme format Indonesia, kolom Tahap D5 17%, prosa instruksi dipendekkan', [1, 2, 3, 4].every(n => a.d.querySelector('#ac_sev-' + n + ' .sev-tag').textContent === 'Tahap ' + n) && (() => { $(a.d, 'd5_iv').value = '28'; $(a.d, 'd5_start').value = '2026-11-15'; const r = a.w._serahData().ritme || ''; $(a.d, 'd5_iv').value = ''; $(a.d, 'd5_start').value = ''; return /mulai 15 Nov 2026/.test(r); })() && /width:17%">Tahap</.test(css) && !/tidak diulang dari Form 1\/2/.test(css) && !/no overclaiming/.test(css) && !/Pasien membawa pulang catatan ini/.test(css), a.w._serahData().ritme);
      check('F2 ponsel: SEMUA tabel .tbl dibungkus .tblwrap (geser samping, min-width 680 di ≤640), rel bagian modal statis di ponsel, tombol dialog login bertumpuk di ≤480', !!a.d.querySelector('.tblwrap > table.tbl input.cell[value="Sekarang"]') && [...a.d.querySelectorAll('table.tbl')].every(t => t.parentElement.classList.contains('tblwrap')) && /\.tblwrap table\.tbl\{min-width:680px;\}/.test(css) && /@media \(max-width:640px\)\{ \.ovl \.pmodal \.pmrail\{position:static;\} \}/.test(css) && /@media \(max-width:480px\)\{\.ldlg \.b \.sp\{display:none\}/.test(css));
      check('F2 penomoran: kode seksi D0–D8 hanya di cetak (.sec .n disembunyikan @media screen), rujukan di layar memakai nama langkah', /@media screen\{ \.sec \.n\{display:none !important;\} \}/.test(css) && !/Diagnosis \(D1\): /.test(css) && !/\(D7\) — handoff/.test(css) && !/di D7\./.test(css) && !/\(D4b\) —/.test(css) && /langkah 5 · Sign-off dokter/.test(css) && a.d.querySelectorAll('.step .sec .n').length >= 10);
      check('F2 lantai ukuran: "+N lagi" 44 px, chip WAJIB = <button> (OK disabled), checkbox modal 16 px, SARAN PROTOKOL 12 px, badge/desk kartu 12–12.5 px, catatan 12.5 px', /\.reqbar \.tg\{[^}]*min-height:44px/.test(css) && !!a.d.querySelector('#reqlst button.it') && !a.d.querySelector('#reqlst span.it') && !/\{width:13px;height:13px;accent-color:/.test(css) && /\.rs-l\{display:inline-block;font-size:12px/.test(css) && /\.sev-desc\{font-size:12\.5px/.test(css) && /\.note\{font-size:12\.5px/.test(css) && /\.pmctx\{[^}]*font-size:12\.5px/.test(css));
      check('Dialog login/TTD: tautan selalu di baris sendiri di bawah tombol (baris 1 = Batal + utama rata kanan), 4 form', ['ADC_Form2_Asesmen_Umum_Dokter.html', 'ADC_Form1_Registrasi_Anamnesis_Pasien.html', 'ADC_Form_Asesmen_Slimming_SpGK.html', 'ADC_SkinQualityProgram_Journey_Outcome_Tracker.html'].every(f => /\.ldlg \.b \.ok\{order:3\}\.ldlg \.b \.lnk\{order:4;flex-basis:100%/.test(fs.readFileSync(path.join('www', f), 'utf8'))));
      check('F2 kontrol pilihan: radio berchip bulat (override reset radius .ovl), label modal hair 12.5 px, tanpa outline:none di isian modal, hover ICD --accent-act, psub & sub-label chip 12 px', /\.ovl \.rbopt::before\{border-radius:50% !important;\}/.test(css) && /#ovl_hair \.f label\{font-size:12\.5px !important/.test(css) && !/\.ln:focus\{outline:none/.test(css) && !/\.td-input:focus\{outline:none/.test(css) && !/padding:3px 2px;outline:none;width:100%/.test(css) && /\.icdbtn:hover\{background:var\(--accent-act/.test(css) && /\.prog \.psub\{font-size:12px/.test(css) && !/\.hubchip span\{font-size:11px;\}/.test(css));
      check('Tautan aksi di status sign-off & kunci jadwal >= 44 px (CSS)', /\.ttdst button\.lnk,#sched_lock \.lnk\{[^}]*min-height:44px/.test(css));
      check('Menu Lainnya tanpa "Terbitkan Handoff" — terbit hanya dari akhir langkah 6', !a.d.querySelector('#tbmenu [onclick*="issueHandoff"]') && !!a.d.querySelector('.step[data-step="5"] .stepnav .nb-terbit'));
      check('F2 onboard: Panduan di menu Lainnya (tab baru), judul langkah 1 "Identitas pasien", tombol perawat menyebut hasil, grid program 3 kolom, catatan D5 tanpa singkatan', !!a.d.querySelector('#tbmenu a[role="menuitem"][href="ADC_Panduan_Pengisian_Form.html"][target="_blank"]') && /Identitas pasien, handoff/.test(a.d.querySelector('.step[data-step="0"] .sec').textContent) && /Identitas & handoff/.test($(a.d, 'rb0').textContent) && /Buat jadwal kontrol/.test($(a.d, 'sb1').textContent) && /Kirim reminder/.test($(a.d, 'sb3').textContent) && /\.prog-grid\{display:grid;grid-template-columns:repeat\(3,1fr\)/.test(css) && /Biaya ditanyakan ke bagian depan/.test(css) && !/Harga: bagian depan/.test(css) && /\.tbmenu button,\.tbmenu a\{/.test(css));
      check('Dialog tinjauan muat viewport: .mdlg-bg overflow:auto, .mdlg.sdlg max-height viewport + flex kolom, .miss menggulir, tombol tetap', /\.mdlg-bg\{[^}]*padding:6vh 16px 16px;overflow:auto;\}/.test(css) && /\.mdlg\.sdlg\{max-height:calc\(100vh - 6vh - 16px\);display:flex;flex-direction:column;min-height:0;\}/.test(css) && /\.mdlg\.sdlg \.miss\{flex:1 1 auto;min-height:0;overflow:auto/.test(css) && /class="mdlg sdlg tdlg"/.test(css) && /class="mdlg sdlg"/.test(css));
      check('F2 polish 5: keterangan kartu program, label band modal, sub-label hair, "dilewati", badge palang/bendera >= 12 px', /\.progbtn \.psub\{font-size:12px/.test(css) && /\.ovl \.pmodal \.band \.rl\{font-size:12px;\}/.test(css) && /#ovl_hair \.sublab\{font-size:12px !important/.test(css) && /\.hobar \.hb-badge\{[^}]*font-size:12px/.test(css) && /\.flag \.badge\{[^}]*font-size:12px/.test(css));
      check('F2 polish 4: sub-label modal, pill, "opsional", hitung WAJIB, sumber alergi >= 12 px', /\.pmhead \.sub\{font-size:12px/.test(css) && /#ovl_acne \.sub\{font-size:12px/.test(css) && /\.opt\{font-size:12px/.test(css) && /\.reqbar \.cnt\{[^}]*font-size:12px/.test(css) && /\.flag \.alg-src\{font-size:12\.5px/.test(css));
      check('F2 polish 3: subjudul hijau modal pakai --green-text; dialog login urutan DOM PIN -> Masuk -> Batal -> tautan (tata letak via flex order)', !/style="color:var\(--green\)"/.test(css) && /style="color:var\(--green-text\)">Prosedur/.test(css) && (() => { const bg = a.w._ldlgBuat(); const ids = [...bg.querySelectorAll('input,button')].map(e => e.id); return ids.join(',') === 'ldlg_id,ldlg_pin,ldlg_ok,ldlg_x,ldlg_set,ldlg_out'; })() && /\.ldlg \.b \.lnk\{order:4;flex-basis:100%/.test(css), [...a.w._ldlgBuat().querySelectorAll('input,button')].map(e => e.id).join(','));
      check('F2 polish 2: judul D5 satu keterangan, tanpa teks instruksi staf di modal/D3, isyarat 4 faktor pendek, petunjuk di dialog ICD-10', a.d.querySelectorAll('.step .sec .n').length > 0 && /opsional — catatan pegangan pasien/.test([...a.d.querySelectorAll('.sec')].find(s => /D5/.test(s.textContent)).textContent) && !/case-by-case/.test(css) && !/jangan ketik ulang/.test(css) && !/Rujukan bila perlu/.test(css) && !/centang pemicu di kiri dulu/.test(css) && a.d.querySelectorAll('#ovl_acne .tx-hint').length === 5 && (a.w.openICD(), /lebih dari satu kode/.test($(a.d, 'icdlg').textContent)) && (a.w.closeICD(), true));
      { a.w.setMode('kontrol'); const k = $(a.d, 'tb_muatho').classList.contains('tan') && !$(a.d, 'tb_muat1').classList.contains('tan'); a.w.setMode('awal');
        check('Toolbar: satu tombol muat sesuai mode — Muat Form 1 saat awal, Muat Handoff saat kontrol (yang lain disembunyikan); Cetak di menu Lainnya', k && $(a.d, 'tb_muat1').classList.contains('tan') && !$(a.d, 'tb_muatho').classList.contains('tan') && !a.d.querySelector('.tb-actions > .btn.tan[onclick="cetakSemua()"]')); }
      check('F2 chrome 1024: saklar kunjungan di toolbar (tersegmen, aria-pressed, setMode tetap), .ctlbar hanya bilah WAJIB, rel 44 px, palang kontrol satu kalimat', !!a.d.querySelector('.toolbar .modebar #mb_awal[aria-pressed="true"]') && !a.d.querySelector('.ctlbar .modebar') && (() => { a.w.setMode('kontrol'); const k = $(a.d, 'mb_kontrol').getAttribute('aria-pressed') === 'true' && $(a.d, 'mb_awal').getAttribute('aria-pressed') === 'false'; a.w.setMode('awal'); return k; })() && /\.rail button\{[^}]*padding:8px 12px 10px 0;min-height:44px/.test(css) && /ikut terbawa\.<\/span>/.test(css) && !/berkas hilang \/ kunjungan lama/.test(css));
      check('F2: toolbar tidak lengket — bilah WAJIB (.ctlbar sticky top:0) tidak tertutup toolbar saat digulir', /.toolbar{padding:14px 36px;position:static;}/.test(css) && /.ctlbar{position:sticky;top:0;/.test(css));
      check('F2 ponsel: aturan <= 640 px ada — toolbar & bilah kontrol melipat dan statis, tabel 4 faktor ditumpuk', /@media \(max-width:640px\)\{\s*\.toolbar\{position:static;flex-wrap:wrap/.test(css) && /#ovl_acne \.ff-table thead\{display:none;\}/.test(css) && /\.ctlbar\{position:static/.test(css));
      check('F2 kontras: tidak ada placeholder #7E817D, hint seksi modal pakai --ink-muted, nomor seksi accent-deep, tombol pop-up #B0603F, token --ink-faint digelapkan', !/#7E817D/i.test(css) && /\.sec-label \.hint\{opacity:1;color:var\(--ink-muted\)/.test(css) && /\.sec \.n\{color:var\(--accent-deep\) !important/.test(css) && !/background:#C97A5E;color:#fff/.test(css) && /--ink-faint:#6F685B/.test(css));
      check('F2 polish: sisa cetak (tanda tangan basah, cap, footer, disclaimer) disembunyikan di layar; Fitzpatrick s5 & Tipe kulit s7 sebaris', /@media screen\{ \.sigs,\.stamp,\.foot,\.disc\{display:none !important;\} \}/.test(css) && a.d.querySelector('input[name=d1_fitz]').closest('.f').classList.contains('s5') && $(a.d, 'd1_tk').closest('.f').classList.contains('s7')); }
    check('F2: alergi & dokter terisi dari intake', $(a.d, 'alergi_flag').value === 'Penisilin' && $(a.d, 'd1_dokter').value === 'dr. Uji, Sp.DVE');
    check('F2 pasien baru: kotak isian alergi disembunyikan, alergi tampil di Ringkasan Form 1', $(a.d, 'alergi_box').style.display === 'none' && $(a.d, 'alergi_flag').value === 'Penisilin' && /Penisilin/.test($(a.d, 'intake_body').textContent), { box: $(a.d, 'alergi_box').style.display, al: $(a.d, 'alergi_flag').value });
    check('F2: Ringkasan menampilkan detail keluhan P4 dari Form 1', /Detail keluhan/.test($(a.d, 'intake_body').textContent), a.w._intake && (a.w._intake.seksi || []).map(s => s.kode));
    check('F2 Ringkasan: label pasangan 12 px huruf biasa, nilai 15 px biru isian (--ink-fill), grid min 190 px; label pertanyaan pasien jadi label klinis',
      /\.intake \.kv \.k\{font-size:12px;[^}]*text-transform:none/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')) &&
      /\.intake \.kv \.v\{font-size:15px;[^}]*color:var\(--ink-fill\)/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')) &&
      /\.intake \.tier:not\(\.crit\) \.tc b\{color:var\(--ink-fill\)/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')) &&
      /\.intake \.kvgrid\{grid-template-columns:repeat\(auto-fill,minmax\(190px/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')) &&
      a.w._kLabel('Jenis jerawat yang Anda rasakan') === 'Jenis jerawat' && a.w._kLabel('Sudah ada bekas?') === 'Sudah ada bekas' && a.w._kLabel('Pemakaian sunscreen saat ini') === 'Sunscreen saat ini' && a.w._kLabel('Lokasi utama') === 'Lokasi utama' &&
      /Lokasi utama/.test($(a.d, 'intake_body').textContent) && !/yang Anda/.test($(a.d, 'intake_body').textContent) && !!a.d.querySelector('#intake_body .none.sub'),
      { k: ['Jenis jerawat yang Anda rasakan', 'Sudah ada bekas?', 'Pemakaian sunscreen saat ini'].map(a.w._kLabel) });
    { const ik2 = JSON.parse(JSON.stringify(a.w._intake)); ik2.kritis.alergi = 'Sulfa'; a.w.applyIntake(ik2); }
    check('F2: kotak alergi disembunyikan bila Ringkasan Form 1 tampil (tidak dobel)', $(a.d, 'alergi_box').style.display === 'none' && $(a.d, 'intake_body').textContent.includes($(a.d, 'alergi_flag').value) && $(a.d, 'alergi_flag').value !== '', { box: $(a.d, 'alergi_box').style.display, alergi: $(a.d, 'alergi_flag').value });
    check('F2: muat ulang Form 1 yang dikoreksi menimpa alergi lama', $(a.d, 'alergi_flag').value === 'Sulfa' && /Sulfa/.test($(a.d, 'intake_body').textContent), $(a.d, 'alergi_flag').value);
    { const ik3 = JSON.parse(JSON.stringify(a.w._intake)); ik3.kritis.alergi = ''; ik3.kritis.alergi_nihil = true; a.w.applyIntake(ik3); }
    check('F2: Form 1 "tidak ada alergi" -> nihil, ringkasan menyebut Nihil', $(a.d, 'alergi_flag').value === '' && $(a.d, 'alergi_none').checked && /Nihil/.test($(a.d, 'intake_body').textContent));
    { const ik5 = JSON.parse(JSON.stringify(a.w._intake)); ik5.kritis.alergi = ''; ik5.kritis.alergi_nihil = false; a.w.applyIntake(ik5);
      const rq = a.w.reqStatus().find(x => x.label === 'Alergi dikonfirmasi');
      check('F2: Form 1 TANPA info alergi -> kotak alergi tetap tampil (dokter mencatat konfirmasi lisan), WAJIB mengarah ke kotak, ringkasan menyebut kotak', $(a.d, 'alergi_box').style.display !== 'none' && rq && !rq.ok && rq.go === 'alergi_box' && /catat di kotak/.test($(a.d, 'intake_body').textContent), { box: $(a.d, 'alergi_box').style.display, rq });
      chk(a.d, 'alergi_none'); check('F2: centang Nihil di kotak itu memenuhi WAJIB alergi', a.w.reqStatus().find(x => x.label === 'Alergi dikonfirmasi').ok);
      check('F2: _programDerajat tidak menggandakan "Melasma" untuk program Hiperpigmentasi/Melasma', a.w._programDerajat({ program: 'Hiperpigmentasi/Melasma', derajat: 'Melasma IGA 3 · Sedang (Moderate)' }) === 'Hiperpigmentasi/Melasma — IGA 3 · Sedang (Moderate)' && a.w._programDerajat({ program: 'Acne', derajat: 'Acne IGA 3 · Sedang' }) === 'Acne IGA 3 · Sedang', a.w._programDerajat({ program: 'Hiperpigmentasi/Melasma', derajat: 'Melasma IGA 3 · Sedang (Moderate)' })); }
    { const ik4 = JSON.parse(JSON.stringify(a.w._intake)); ik4.kritis.alergi = 'Penisilin'; ik4.kritis.alergi_nihil = false; a.w.applyIntake(ik4); }
    check('F2 modal: radio terpilih seragam dengan chip centang (latar krem + garis terakota, bukan blok hitam)', fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8').includes('.ovl .rbopt.on{background:var(--surface-quiet,#F5EFE6);border-color:var(--accent,#C97A5E);'));
    check('F2: ringkasan intake tampil', $(a.d, 'intake_box').style.display !== 'none');
    { const hc = a.w.consentHTML({ no: 'IC-X', tanggal: '2026-11-11T03:00:00Z', dokter: 'dr. Uji', program: ['acne'], pasien: { nama: 'P', rm: 'R' }, tindakan: [{ nama: 'Excel V' }, { nama: 'Excel-V' }, { nama: 'Peeling' }, { nama: 'PicoSure Pro' }],
        penjelasan: { diagnosis: 'Acne vulgaris\nderajat IGA 3', tindakan_tujuan: 'Excel V, Peeling — bertujuan mengurangi lesi aktif.', risiko: '• Excel V: kemerahan 1–3 hari; jarang: lepuh\n• PicoSure Pro: kemerahan 1–3 hari; jarang: lepuh\n• Peeling: perih; jarang: infeksi\nRisiko umum: hasil berbeda antar individu.', alternatif: 'Topikal saja', tanpa_tindakan: 'lesi bertambah', prognosis: 'Bertahap', biaya: '' } });
      check('Lembar consent: judul bagian berupa pertanyaan, tindakan tanpa duplikat (Excel V/Excel-V = 1), tujuan tanpa daftar ulang, risiko jadi tabel 3 kolom dengan tindakan berisiko sama digabung, pilihan MENYETUJUI/MENOLAK',
        /Apa kondisi Anda\?/.test(hc) && /Apa yang mungkin terjadi setelah tindakan\?/.test(hc) && (hc.match(/<li>/g) || []).length === 3 && /Tujuannya:<\/b> Bertujuan mengurangi/.test(hc) && /<table class="rk">/.test(hc) && (hc.match(/<tr><td class="tn">/g) || []).length === 2 && /Excel V<br>PicoSure Pro/.test(hc) && /Jarang terjadi/.test(hc) && /Risiko umum/.test(hc) && /MENYETUJUI/.test(hc) && /MENOLAK/.test(hc) && /PERSETUJUAN TINDAKAN KEDOKTERAN/.test(hc), { li: (hc.match(/<li>/g) || []).length, tr: (hc.match(/<tr><td class="tn">/g) || []).length }); }
    { const k1 = a.w._psKontrolBerikut({ kunjungan_berikutnya: '2026-11-25' }, 'kontrol tiap 14 hari'), k0 = a.w._psKontrolBerikut({}, '');
      check('Lembar cetak: kotak "Kontrol berikutnya" memuat hari + tanggal panjang, ritme, dan penjelasan pentingnya jadwal; tanpa tanggal -> "diinformasikan perawat"', /class="ps-next"/.test(k1) && /Rabu, 25 November 2026/.test(k1) && /kontrol tiap 14 hari/.test(k1) && /Mengapa jadwal ini penting/.test(k1) && /menjadwalkan ulang/.test(k1) && /diinformasikan perawat/.test(k0), k1.slice(0, 200)); }
    { const ig = await open('ADC_Form2_Asesmen_Umum_Dokter.html'); const segA = ig.d.querySelector('#ovl_acne .igaseg[data-iga="ac_iga"]'), segM = ig.d.querySelector('#ovl_melasma .igaseg[data-iga="me_iga"]');
      check('IGA di form program: Bagian B Acne & Melasma punya 5 tombol IGA (ac_iga / me_iga); kartu umum langkah 2 tanpa tombol + petunjuk "dinilai di form program"', !!segA && !!segM && segA.querySelectorAll('button').length === 5 && segM.querySelectorAll('button').length === 5 && $(ig.d, 'igacard_umum').classList.contains('ro-umum') && /dinilai di form program/.test($(ig.d, 'igastat_umum').textContent));
      ig.w.pickStage('acne', 2); segA.querySelector('button[data-v="3"]').click(); await sleep(30);
      const kartu = $(ig.d, 'igacard_acne');
      check('IGA di form program: ketuk 3 di modal -> ac_iga=3, cermin modal & kartu langkah 2 ikut (aria-pressed), kartu baca-saja + tombol "Ubah di form program", Derajat terhitung', $(ig.d, 'ac_iga').value === '3' && segA.querySelector('button[data-v="3"]').getAttribute('aria-pressed') === 'true' && kartu.querySelector('.igaseg button[data-v="3"]').classList.contains('on') && kartu.classList.contains('ro') && /Ubah di form program/.test(kartu.querySelector('.iga-buka').textContent) && /Acne IGA 3/.test($(ig.d, 'd2_derajat').value) && /Baseline/.test($(ig.d, 'igastatm_acne').textContent), { v: $(ig.d, 'ac_iga').value, dj: $(ig.d, 'd2_derajat').value });
      ig.w.setMode('kontrol');
      check('IGA kontrol: kartu langkah 2 bisa diketuk lagi (bukan cermin), tombol "form program" disembunyikan', !kartu.classList.contains('ro') && kartu.querySelector('.iga-buka').style.display === 'none' && !$(ig.d, 'igacard_umum').classList.contains('ro-umum')); }
    { const lb = a.d.querySelector('label[for="d2_dx_catatan"]'); set(a.d, 'd2_dx_catatan', 'DD: rosasea; pantau respons 4 minggu');
      check('F2: kolom "Catatan dokter" di bawah Diagnosis (berlabel, setelah chip ICD) -> asesmen.diagnosis_catatan', !!lb && /Catatan dokter/.test(lb.textContent) && !!($(a.d, 'd2_icd_chips').compareDocumentPosition($(a.d, 'd2_dx_catatan')) & 4) && a.w.buildHandoff().asesmen.diagnosis_catatan === 'DD: rosasea; pantau respons 4 minggu'); }
    { const f2n = await open('ADC_Form2_Asesmen_Umum_Dokter.html'); await until(() => f2n.w._neoOn === true, 3000).catch(() => {});
      set(f2n.d, 'rm', 'RM-NEO-01'); $(f2n.d, 'rm').dispatchEvent(new f2n.w.Event('change', { bubbles: true }));
      await until(() => $(f2n.d, 'p_nama').value === 'Pasien NeoSoft', 4000).catch(() => {});
      check('F2 NeoSoft: pasien kontrol tanpa Form 1 di hub -> RM diisi -> nama/NIK/WA dari NeoSoft + catatan', $(f2n.d, 'p_nama').value === 'Pasien NeoSoft' && $(f2n.d, 'p_nik').value === '3273019900000001' && $(f2n.d, 'p_wa').value === '081277770001' && /identitas dari NeoSoft/.test($(f2n.d, 'rm_neo').textContent), { nama: $(f2n.d, 'p_nama').value, note: $(f2n.d, 'rm_neo').textContent }); }
    { const asli = JSON.parse(JSON.stringify(a.w._intake)); const lain = JSON.parse(JSON.stringify(asli)); lain.pasien = { nama: 'Orang Lain', rm: 'RM-LAIN', nik: '1111222233334444', wa: '0800' };
      a.w.confirm = m => { a.dialogs.push({ type: 'confirm', msg: String(m) }); return false; }; a.dialogs.length = 0; a.w.applyIntake(lain);
      const tolak = /DATA PASIEN BERBEDA/.test((a.dialogs.find(x => x.type === 'confirm') || {}).msg || '') && $(a.d, 'p_nama').value === 'Pasien Uji Coba' && $(a.d, 'rm').value === RM && a.w._intake.pasien.rm === RM;
      a.w.confirm = m => { a.dialogs.push({ type: 'confirm', msg: String(m) }); return true; }; a.w.applyIntake(lain);
      const ganti = $(a.d, 'p_nama').value === 'Orang Lain' && $(a.d, 'rm').value === 'RM-LAIN' && $(a.d, 'p_nik').value === '1111222233334444' && a.w._intake.pasien.rm === 'RM-LAIN' && /Orang Lain/.test($(a.d, 'intake_meta').textContent);
      check('F2: memuat Form 1 pasien LAIN di atas identitas terisi -> tanya; Batal = tidak ada yang berubah; Ganti = semua kolom identitas ditimpa (tidak ada dua pasien di satu layar)', tolak && ganti, { tolak, ganti, nama: $(a.d, 'p_nama').value });
      a.w.applyIntake(asli); check('F2: muat ulang pasien asli -> identitas kembali', $(a.d, 'p_nama').value === 'Pasien Uji Coba' && $(a.d, 'rm').value === RM); }
    check('F2: mode awal', a.w._mode === 'awal');

    set(a.d, 'd2_dx', 'Acne vulgaris grade sedang'); set(a.d, 'd2_hasil', 'Temuan: papul rahang\nPenunjang: panel hormon'); a.d.querySelectorAll('#d1_tk input').forEach(c => { if (['Kombinasi', 'Sensitif'].includes(c.value)) { c.checked = true; c.dispatchEvent(new a.w.Event('change', { bubbles: true })); } });
    check('F2: tipe kulit pilihan ganda tergabung ke d1_tipekulit', $(a.d, 'd1_tipekulit').value === 'Kombinasi, Sensitif' && !a.d.querySelector('select#d1_tipekulit'), $(a.d, 'd1_tipekulit').value); a.w.setIGA('ac_iga', '3'); a.w.pickStage('acne', 1);
    check('F2: IGA 3 -> program Acne aktif', a.w.activeProgs().includes('acne'));
    const rxIn = a.d.querySelectorAll('#ovl_acne .rx-table tbody tr:not(.rx-saran)')[0].querySelectorAll('input');
    rxIn[0].value = 'Tretinoin 0,025%'; rxIn[1].value = 'Malam'; rxIn[2].value = 'Oles tipis'; rxIn[3].value = '8 minggu';
    set(a.d, 'd5_iv', a.d.querySelector('#d5_iv option:nth-child(2)') ? a.d.querySelector('#d5_iv option:nth-child(2)').value : '14');
    set(a.d, 'd5_start', '2026-10-05'); set(a.d, 'd7_remarks', 'Hindari matahari'); set(a.d, 'd8_by', 'Perawat Uji');
    set(a.d, 'd6_hindari', 'Hindari scrub');
    a.w.updateReq();
    check('F2: baris skrining obat muncul karena resep memuat Tretinoin', $(a.d, 'lbl_skrining').style.display !== 'none' && /Tretinoin/.test($(a.d, 'skrining_obat').textContent), $(a.d, 'skrining_obat').textContent);
    /* ICD-10 */
    a.w.openICD(); a.w._icdRender('melasma');
    check('F2: pemilih ICD-10 terbuka & pencarian "melasma" -> L81.1', $(a.d, 'icdlg').classList.contains('on') && /L81\.1/.test($(a.d, 'icd_list').textContent) && !/L70\.0/.test($(a.d, 'icd_list').textContent), $(a.d, 'icd_list').textContent.slice(0, 80));
    a.w.pickICD('L70.0'); a.w.pickICD('L81.0'); a.w.pickICD('L70.0');
    { const css44 = fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8');
      check('F2 sasaran 44 px: penghapus chip ICD = <button aria-label>; Pakai / picker / tambah / hapus baris / tombol ICD / Muat Handoff sekarang / override / Nihil / sel jadwal / dialog login >= 44 px di CSS', a.d.querySelectorAll('#d2_icd_chips button.x[aria-label^="Hapus kode"]').length === 2 && !a.d.querySelector('#d2_icd_chips i') && /\.rs-pakai\{[^}]*min-height:44px/.test(css44) && /\.rxpick-btn\{flex:none;width:44px;min-height:44px/.test(css44) && /\.rxadd\{[^}]*min-height:44px/.test(css44) && /\.rxdel\{flex:none;width:44px;min-height:44px/.test(css44) && /\.icdbtn\{[^}]*min-height:44px/.test(css44) && /\.icdchips span \.x\{[^}]*min-width:44px;min-height:44px/.test(css44) && /\.hobar \.hb-act\{[^}]*min-height:44px/.test(css44) && /\.hobar \.hb-ovr\{[^}]*min-height:44px/.test(css44) && /\.flag \.none\{[^}]*min-height:44px/.test(css44) && /\.serah-now button\{[^}]*min-height:44px/.test(css44) && /\.cell,td \.cell\{[^}]*min-height:44px/.test(css44) && /\.ldlg button\{font:inherit;font-size:14px;font-weight:600;min-height:44px;/.test(css44)); }
    check('F2: dua kode ICD terpilih (tanpa dobel), chip tampil, dialog tertutup', a.w._icdData().map(x => x.kode).join(',') === 'L70.0,L81.0' && $(a.d, 'd2_icd_chips').querySelectorAll('span').length === 2 && !$(a.d, 'icdlg').classList.contains('on'), a.w._icdData());
    a.w.hapusICD('L81.0');
    check('F2: hapus satu kode ICD', a.w._icdData().length === 1 && a.w._icdData()[0].kode === 'L70.0');
    /* lembar informed consent */
    a.dialogs.length = 0; a.w.__popup = null; a.w.bukaConsent();
    check('F2 D7: dialog consent terisi dari asesmen (diagnosis, ICD, tujuan acne, prognosis)', $(a.d, 'cdlg').classList.contains('on') && /Acne vulgaris grade sedang/.test($(a.d, 'cd_1').value) && /L70\.0/.test($(a.d, 'cd_1').value) && /lesi aktif/.test($(a.d, 'cd_2').value) && /4–8 minggu/.test($(a.d, 'cd_6').value) && $(a.d, 'cd_dokter').value === 'dr. Uji, Sp.DVE', { c1: $(a.d, 'cd_1').value, c2: $(a.d, 'cd_2').value.slice(0, 60) });
    $(a.d, 'cd_ok').click();
    check('F2 D7: consent tanpa tindakan ditolak', a.dialogs.some(x => x.type === 'alert' && /minimal satu tindakan/.test(x.msg)) && $(a.d, 'cdlg').classList.contains('on'));
    $(a.d, 'cd_tind').value = 'Chemical peeling'; $(a.d, 'cd_7').value = 'Rp 750.000 / sesi'; $(a.d, 'cd_saksi').value = 'Perawat Uji';
    check('F2 D7: risiko peeling dari pustaka risiko', /pengelupasan/.test(a.w._icRisiko(['Chemical peeling'])));
    $(a.d, 'cd_ok').click();
    await until(() => /tercatat di hub/.test($(a.d, 'd8_consent_lbl').textContent), 3000);
    const icNo = $(a.d, 'd8_consent_no').value;
    check('F2 D7: nomor lembar IC-RM-tanggal tercatat & ✓ hub; pop-up lembar cetak dibuat', /^IC-RM-TEST-001-\d{8}-\d{5}$/.test(icNo) && /✓ tercatat di hub/.test($(a.d, 'd8_consent_lbl').textContent) && a.w.__popup && /PERSETUJUAN TINDAKAN KEDOKTERAN/.test(a.w.__popup.document.html) && a.w.__popup.document.html.includes(icNo) && /MENYETUJUI/.test(a.w.__popup.document.html) && /Chemical peeling/.test(a.w.__popup.document.html), { icNo, lbl: $(a.d, 'd8_consent_lbl').textContent });
    { const cf = disk('consent_' + icNo + '.json');
      check('hub: consent_<no>.json tersimpan (7 penjelasan, NIK, biaya, stempel audit)', cf && cf.doc === 'ADC-CONSENT' && cf.pasien.nik === '3273012345678901' && cf.penjelasan.biaya === 'Rp 750.000 / sesi' && cf.tindakan[0].nama === 'Chemical peeling' && cf._audit.oleh === 'dokter', cf && Object.keys(cf));
      const pk = await (await fetch(BASE + '/api/pasien/' + RM, { headers: Hd('dokter') })).json();
      check('hub: /api/pasien/:rm mendaftar lembar consent', pk.consent && pk.consent.length === 1 && pk.consent[0].no === icNo && /Chemical/.test(pk.consent[0].tindakan), pk.consent); }
    chk(a.d, 'd8_consent'); chk(a.d, 'd8_skrining');
    { const sd = await signoff(a);
      check('F2 D7: mencentang "Asesmen selesai" langsung membuka dialog PIN dokter; stempel tersimpan, status "Ditandatangani", tanggal sign-off terisi', sd === true && a.w._ttd && a.w._ttd.id === 'dokter' && /Ditandatangani · dr\. Uji/.test($(a.d, 'd8_ttd').textContent) && $(a.d, 'd8_ttd').classList.contains('ok') && $(a.d, 'd8_tgl').value === new Date().toISOString().slice(0, 10) && $(a.d, 'd8_dokter').value === 'dr. Uji, Sp.DVE', { t: $(a.d, 'd8_ttd').textContent, tgl: $(a.d, 'd8_tgl').value });
      chk(a.d, 'd8_signoff', false); check('F2 D7: mencabut centang membatalkan stempel', a.w._ttd === null && $(a.d, 'd8_ttd').textContent === '');
      await signoff(a); }
    set(a.d, 'd8_dokter', 'dr. Uji, Sp.DVE');
    a.w.updateReq();
    const miss = a.w.reqStatus().filter(x => !x.ok).map(x => x.label);
    check('F2 awal: bar wajib lengkap kecuali yang memang tak diisi', miss.length === 0, miss);
    check('Bar WAJIB lengkap: hitungan "— lengkap", tidak ada chip belum, tombol "lihat rincian"', /lengkap/.test($(a.d, 'reqcnt').textContent) && a.d.querySelectorAll('#reqlst .it.no').length === 0 && /lihat rincian/.test(($(a.d, 'reqlst').querySelector('.tg') || {}).textContent || ''), $(a.d, 'reqlst').textContent);
    { a.w.toggleReqSemua(); const t1 = $(a.d, 'reqbar').classList.contains('semua') && /sembunyikan/.test($(a.d, 'reqlst').querySelector('.tg').textContent) && a.d.querySelectorAll('#reqlst .it.ok').length === a.w.reqStatus().length; a.w.toggleReqSemua();
      check('Bar WAJIB: "lihat semua" membuka butir OK lalu menutupnya lagi', t1 && !$(a.d, 'reqbar').classList.contains('semua')); }
    a.w.generateSchedule();
    check('F2: jadwal ter-generate', (a.w._schedRows || []).length > 0, a.w.buildSchedule && a.w.buildSchedule());
    { a.w.serahkanKePerawat();
      check('Serah terima: tinjauan tampil — semua wajib lengkap, sign-off Ditandatangani, 1 baris resep, ritme kontrol, program Acne; "Serahkan" tombol utama', $(a.d, 'sdlg').classList.contains('on') && $(a.d, 'sdlg_ok').classList.contains('mdlg-ok') && $(a.d, 'sdlg_x').classList.contains('mdlg-x') && /Serahkan ke perawat\?/.test($(a.d, 'sdlg_t').textContent) && /Semua butir wajib lengkap/.test($(a.d, 'sdlg_miss').textContent) && /Ditandatangani · dr\. Uji/.test($(a.d, 'sdlg_kv').textContent) && /1 baris/.test($(a.d, 'sdlg_kv').textContent) && /tiap/.test($(a.d, 'sdlg_kv').textContent) && /Acne/.test($(a.d, 'sdlg_kv').textContent), $(a.d, 'sdlg_kv').textContent);
      $(a.d, 'sdlg_ok').click();
      check('Serah terima: Serahkan -> langkah 6 dengan ringkasan status dokter baca-saja', a.w._step === 5 && !$(a.d, 'sdlg').classList.contains('on') && /Ditandatangani/.test($(a.d, 'serah_ringkas').textContent) && /Semua lengkap/.test($(a.d, 'serah_ringkas').textContent));
      check('Langkah 6: baris "Sekarang" menyebut aksi berikutnya; stepper: Generate ✓ (sudah), Simpan aktif; webhook tersembunyi; Terbitkan tidak redup (sudah tanda tangan)', /Sekarang/.test($(a.d, 'serah_now').textContent) && /Simpan jadwal/.test($(a.d, 'serah_now').textContent) && $(a.d, 'sb1').classList.contains('done') && $(a.d, 'sb1').querySelector('.sn').textContent === '✓' && $(a.d, 'sb2').classList.contains('pri') && !$(a.d, 'sb3').classList.contains('pri') && $(a.d, 'cfg_webhook').closest('.f').style.display === 'none' && !a.d.querySelector('.nb-terbit').classList.contains('dim'), $(a.d, 'serah_now').textContent); }
    a.dialogs.length = 0;
    const ttdDlg = await terbit(a);
    check('F2: Terbitkan TIDAK meminta PIN lagi (sudah ditandatangani saat sign-off) & tidak ada dialog peringatan', ttdDlg === false && !a.dialogs.some(x => x.type === 'confirm') && a.w.__tdlgJudul === 'Terbitkan handoff?', a.dialogs.filter(x => x.type === 'confirm'));
    check('F2: popup ringkasan handoff dibuat', a.w.__popup && /Ringkasan Handoff/.test(a.w.__popup.document.html));
    await until(() => a.dialogs.some(x => x.type === 'download' && /^Asesmen_/.test(x.msg)), 3000).catch(() => {});
    check('F2 Terbitkan: berkas Asesmen_<RM>_<tgl>_<jam>.json otomatis diunduh & disebut di kartu selesai', a.dialogs.some(x => x.type === 'download' && /^Asesmen_RM-TEST-001_\d{4}-\d{2}-\d{2}_\d{4}\.json$/.test(x.msg)) && /Asesmen_RM-TEST-001_.*diunduh/.test($(a.d, 'terbit_done_note').textContent), a.dialogs.filter(x => x.type === 'download').map(x => x.msg));
    /* buka kembali asesmen yang baru terbit: potret form ikut di handoff hub, lalu dipulihkan di form kosong */
    { await until(() => disk('handoff_terakhir.json')); const hT = disk('handoff_terakhir.json');
      check('F2 buka-ulang: handoff di hub membawa potret form (_form.isi, mode, stage, intake tanpa _form bersarang)', hT && hT._form && Array.isArray(hT._form.isi) && hT._form.isi.length > 200 && hT._form.mode === 'awal' && !(hT._form.prev && hT._form.prev._form), hT && hT._form && { n: hT._form.isi.length, mode: hT._form.mode });
      const bu = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      check('F2 buka-ulang: menu Lainnya punya "Buka asesmen tersimpan"', !!$(bu.d, 'tb_buka') && /Buka asesmen tersimpan/.test($(bu.d, 'tb_buka').textContent));
      const okBuka = bu.w.bukaAsesmen(hT); const hB = bu.w.buildHandoff();
      check('F2 buka-ulang: form terpulihkan — identitas, diagnosis, ICD, IGA, resep, program & tahap sama dengan yang terbit; TTD ikut; pesan tampil', okBuka === true && $(bu.d, 'rm').value === RM && hB.pasien.nama === hT.pasien.nama && hB.asesmen.diagnosis === hT.asesmen.diagnosis && JSON.stringify(hB.asesmen.icd) === JSON.stringify(hT.asesmen.icd) && hB.asesmen.derajat === hT.asesmen.derajat && JSON.stringify(hB.asesmen.resep) === JSON.stringify(hT.asesmen.resep) && JSON.stringify(hB.asesmen.program) === JSON.stringify(hT.asesmen.program) && JSON.stringify(hB.program_detail) === JSON.stringify(hT.program_detail) && hB.kunjungan_ke === hT.kunjungan_ke && !!bu.w._ttd === !!hT.penerbitan.ttd && bu.dialogs.some(x => x.type === 'alert' && /Asesmen tersimpan dibuka/.test(x.msg)) && bu.w._dibukaUlang.lengkap === true,
        { dx: [hB.asesmen.diagnosis, hT.asesmen.diagnosis], rx: [hB.asesmen.resep.length, hT.asesmen.resep.length], pd: JSON.stringify(hB.program_detail) === JSON.stringify(hT.program_detail), lengkap: bu.w._dibukaUlang && bu.w._dibukaUlang.lengkap });
      set(bu.d, 'd2_hasil', 'Catatan dikoreksi setelah dibuka ulang');
      check('F2 buka-ulang: mengubah isian membatalkan sign-off (centang lepas, TTD kosong, status meminta ulang)', bu.w._ttd === null && !$(bu.d, 'd8_signoff').checked && /perlu diulang/.test($(bu.d, 'd8_ttd').textContent));
      const lama = JSON.parse(JSON.stringify(hT)); delete lama._form; const bl = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      check('F2 buka-ulang: handoff lama tanpa potret ditolak dengan penjelasan; berkas bukan handoff ditolak', bl.w.bukaAsesmen(lama) === false && bl.dialogs.some(x => /sebelum fitur/.test(x.msg)) && bl.w.bukaAsesmen({ doc: 'ADC-INTAKE' }) === false); }
    { a.w.issueHandoff(); await until(() => /^siap —/.test(($(a.d, 'tdlg_hub') || {}).textContent || ''), 2000);
      check('Baris Program di dialog Terbitkan tidak menggandakan nama program; WAJIB terhitung penuh setelah PIN', !/Acne — Acne/.test($(a.d, 'tdlg_kv').textContent) && /IGA/.test($(a.d, 'tdlg_kv').textContent) && !a.w.reqStatus().some(x => x.label === 'Sign-off dokter' && !x.ok) && new RegExp('Wajib ' + a.w.reqStatus().filter(x => x.ok).length + '/' + a.w.reqStatus().length).test($(a.d, 'reqcnt').textContent), { kv: $(a.d, 'tdlg_kv').textContent.slice(0, 120), cnt: $(a.d, 'reqcnt').textContent });
      check('Dialog Terbitkan dengan sesi dokter: baris Hub "siap — handoff disimpan ke hub" (ok), tanpa tombol hub', /siap — handoff disimpan ke hub/.test($(a.d, 'tdlg_hub').textContent) && $(a.d, 'tdlg_hub').classList.contains('ok') && !a.d.querySelector('#tdlg_miss button[data-hub]'), { hub: $(a.d, 'tdlg_hub').textContent, err: a.dialogs.filter(x => x.type === 'jsdomError').slice(-3) });
      $(a.d, 'tdlg_x').click(); }
    { const ns = await open('ADC_Form2_Asesmen_Umum_Dokter.html', { user: null }); set(ns.d, 'p_nama', 'Tanpa Sesi'); set(ns.d, 'rm', 'RM-NS');
      ns.w.issueHandoff(); await until(() => /belum masuk/.test(($(ns.d, 'tdlg_hub') || {}).textContent || ''), 2000);
      check('Dialog Terbitkan tanpa sesi: baris Hub "belum masuk — hanya akan diunduh" + tombol Masuk ke hub', /belum masuk/.test($(ns.d, 'tdlg_hub').textContent) && !!ns.d.querySelector('#tdlg_miss button[data-hub="login"]'), $(ns.d, 'tdlg_hub').textContent);
      $(ns.d, 'tdlg_ok').click(); await sleep(400);
      check('Terbitkan tanpa hub: tidak ada dialog Masuk susulan, status "tidak dikirim ke hub (belum masuk)", kartu selesai warn', !($(ns.d, 'ldlg') && $(ns.d, 'ldlg').classList.contains('on')) && /tidak dikirim ke hub \(belum masuk\)/.test($(ns.d, 'd8_status').value) && /Tidak dikirim ke hub/.test($(ns.d, 'terbit_done_hub').textContent) && $(ns.d, 'terbit_done_hub').classList.contains('warn'), { st: $(ns.d, 'd8_status').value, hub: $(ns.d, 'terbit_done_hub').textContent }); }
    check('F2 terbit: kartu selesai tampil (nama, RM, waktu, hub ✓) + 4 tombol (ringkasan / JSON / cetak / pasien berikutnya); dialog Terbitkan pakai pola #sdlg', !$(a.d, 'terbit_done').hidden && new RegExp('RM ' + RM).test($(a.d, 'terbit_done_l').textContent) && /✓ Tersimpan di hub/.test($(a.d, 'terbit_done_hub').textContent) && $(a.d, 'terbit_done_hub').classList.contains('ok') && a.d.querySelectorAll('#terbit_done .dc-b button').length === 4 && !!a.d.querySelector('#tdlg.mdlg-bg .sdlg.tdlg #tdlg_kv') && !$(a.d, 'tdlg').classList.contains('on'), { l: $(a.d, 'terbit_done_l').textContent, h: $(a.d, 'terbit_done_hub').textContent });
    const h1 = disk('handoff_terakhir.json');
    check('hub: handoff #1 tersimpan', h1 && h1.doc === 'ADC-HANDOFF' && h1.kunjungan_ke === 1 && h1.riwayat.length === 0, h1 && { k: h1.kunjungan_ke });
    check('hub: isian program hanya dari tahap terpilih (tanpa baris default tahap lain)', h1 && (() => { const t = h1.program_detail.acne.isian.join(' | '); return /Tretinoin 0,025%/.test(t) && !/Isotretinoin|Spironolactone|Eritromisin|Excel V/.test(t); })(), h1 && h1.program_detail.acne.isian);
    check('hub: handoff memuat resep, IGA baseline=3, jadwal', h1 && h1.asesmen.resep.some(r => /Tretinoin/.test(r.obat)) && h1.program_detail.acne.iga_baseline === 3 && h1.program_detail.acne.iga === 3 && h1.jadwal.length > 0, h1 && { rx: h1.asesmen.resep, pd: h1.program_detail && h1.program_detail.acne && { b: h1.program_detail.acne.iga_baseline, i: h1.program_detail.acne.iga }, j: h1.jadwal.length });
    check('hub: handoff #1 derajat = rangkuman IGA', h1 && h1.asesmen.derajat === 'Acne IGA 3 · Sedang (Moderate)', h1 && h1.asesmen.derajat);
    check('hub: catatan klinis (temuan + penunjang) tersimpan di handoff', h1 && h1.asesmen.hasil === 'Temuan: papul rahang\nPenunjang: panel hormon', h1 && h1.asesmen.hasil);
    check('hub: resep hanya obat yang diisi dokter (baris contoh tidak ikut)', h1 && h1.asesmen.resep.length === 1 && !/Clindamycin|Sunscreen|Isotretinoin/.test(JSON.stringify(h1.asesmen.resep)), h1 && h1.asesmen.resep.map(r => r.obat));
    check('hub: D6 "Yang harus dihindari" tersimpan di handoff', h1 && h1.asesmen.hindari === 'Hindari scrub', h1 && h1.asesmen.hindari);
    check('hub: penerbitan mencatat consent & skrining + daftar obat berisiko', h1 && h1.penerbitan.consent_tindakan === true && h1.penerbitan.skrining_obat === true && (h1.penerbitan.obat_berisiko || []).includes('Tretinoin 0,025%'), h1 && h1.penerbitan);
    await until(() => /tersimpan di hub/.test($(a.d, 'd8_status').value));
    check('F2: status D7 menyebut ✓ tersimpan di hub (RM)', /✓ tersimpan di hub \(RM RM-TEST-001\)/.test($(a.d, 'd8_status').value), $(a.d, 'd8_status').value);
    check('hub: penerbitan sign-off tercatat', h1 && h1.penerbitan.signoff_dokter === true);
    check('hub: tanda tangan elektronik dokter di handoff (id, nama, waktu, sig) & divalidasi server', h1 && h1.penerbitan.ttd && h1.penerbitan.ttd.id === 'dokter' && h1.penerbitan.ttd.nama === 'dr. Uji, Sp.DVE' && /^[0-9a-f]{64}$/.test(h1.penerbitan.ttd.sig) && h1._audit.ttd_valid === true && h1._audit.oleh === 'dokter', h1 && { ttd: h1.penerbitan.ttd, au: h1._audit });
    check('hub: handoff memuat ICD-10, NIK, pengguna hub, nomor consent & waktu isian per bagian', h1 && h1.asesmen.icd[0].kode === 'L70.0' && h1.pasien.nik === '3273012345678901' && h1.penerbitan.pengguna_hub.id === 'dokter' && h1.penerbitan.consent_no === icNo && h1.waktu_isian && h1.waktu_isian.D1 && h1.waktu_isian.D1.n > 0 && h1.waktu_isian.D1.oleh === 'dr. Uji, Sp.DVE', h1 && { icd: h1.asesmen.icd, wi: h1.waktu_isian });
    check('F2: pop-up handoff & status D7 menyebut TTE / PIN', /PIN diverifikasi hub/.test(a.w.__popup.document.html) && /ICD-10/.test(a.w.__popup.document.html) && /✓ tersimpan di hub/.test($(a.d, 'd8_status').value), $(a.d, 'd8_status').value);

    /* ===== 3. KONTROL tanpa muat handoff -> harus diblok ===== */
    const b0 = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    b0.w.setMode('kontrol'); set(b0.d, 'rm', RM); set(b0.d, 'p_nama', 'Pasien Uji Coba');
    b0.dialogs.length = 0; b0.w.issueHandoff(); await sleep(300);
    check('F2 kontrol tanpa handoff: penerbitan DIBLOK', /Tidak bisa diterbitkan/.test((lastDlg(b0, 'alert') || {}).msg || '') && !disk('handoff_terakhir.json').asesmen.__x && fs.readdirSync(path.join('data', RM)).filter(f => /^handoff_\d/.test(f)).length === 1);
    check('F2 tanpa Form 1: kotak alergi tampil & bisa diisi', $(b0.d, 'alergi_box').style.display !== 'none' && $(b0.d, 'alergi_flag').type !== 'hidden' && !$(b0.d, 'alergi_flag').readOnly);
    check('F2 kontrol: bar wajib menandai "Handoff dimuat" belum', b0.w.reqStatus().some(x => x.label === 'Handoff dimuat' && !x.ok));
    { const s0 = b0.w._step; b0.w.serahkanKePerawat();
      const btn = b0.d.querySelector('#sdlg_miss button[data-go="hobar"]');
      check('Serah terima (belum lengkap): judul menyebut jumlah butir, daftar butir bisa diklik, "Kembali & lengkapi" TERISI (utama) dan "Serahkan dengan N kekurangan" garis, menutup tanpa pindah langkah', /butir wajib belum lengkap/.test($(b0.d, 'sdlg_t').textContent) && !!btn && $(b0.d, 'sdlg_x').classList.contains('mdlg-ok') && $(b0.d, 'sdlg_ok').classList.contains('mdlg-x') && /Serahkan dengan \d+ kekurangan/.test($(b0.d, 'sdlg_ok').textContent) && $(b0.d, 'sdlg_t').classList.contains('warn') && /Belum sign-off/.test($(b0.d, 'sdlg_kv').textContent) && ($(b0.d, 'sdlg_x').click(), !$(b0.d, 'sdlg').classList.contains('on') && b0.w._step === s0));
      b0.w.goStep(5);
      check('Langkah 6 tanpa tanda tangan: "Sekarang: Tunggu dokter menandatangani", Terbitkan redup (masih bisa diklik)', /Tunggu dokter menandatangani/.test($(b0.d, 'serah_now').textContent) && b0.d.querySelector('.nb-terbit').classList.contains('dim') && !b0.d.querySelector('.nb-terbit').disabled, $(b0.d, 'serah_now').textContent);
      $(b0.d, 'sched_lock').querySelector('button').click();
      check('Langkah 6: pesan kunci jadwal menaut ke kolom ritme di langkah 4', b0.w._step === 3 && b0.d.activeElement && b0.d.activeElement.id === 'd5_iv' || b0.w._step === 3); }
    check('Bar WAJIB belum lengkap: chip belum = jumlah butir belum, chip Handoff dimuat bisa diklik, tombol "lihat semua N"', b0.d.querySelectorAll('#reqlst .it.no').length === b0.w.reqStatus().filter(x => !x.ok).length && !!b0.d.querySelector('#reqlst .it.no[data-go="hobar"]') && /lihat semua \d+|\+\d+ lagi/.test($(b0.d, 'reqlst').querySelector('.tg').textContent) && b0.d.querySelectorAll('#reqlst .it.no:not(.lebih)').length <= 3, $(b0.d, 'reqlst').textContent);

    /* ===== 4. KONTROL #2: muat handoff via hub, IGA 1 (turun 2 = sukses) ===== */
    const b = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    muatRM(b, 'muatHandoffHub', RM);
    await until(() => b.w._prevHandoff);
    check('F2: handoff dimuat dari hub -> mode kontrol', b.w._prevHandoff && b.w._mode === 'kontrol', b.dialogs.slice(-2));
    check('F2: identitas & alergi terisi dari handoff', $(b.d, 'p_nama').value === 'Pasien Uji Coba' && $(b.d, 'rm').value === RM && $(b.d, 'alergi_flag').value === 'Penisilin');
    check('F2: program Acne dikenali dari handoff', b.w.progsKunjungan().includes('acne'));
    const baru = b.w.reqStatus().filter(x => !x.ok).map(x => x.label);
    check('F2 kontrol: bar wajib menagih IGA/hasil/dll (belum diisi; dokter pemeriksa terisi dari akun hub)', ['Hasil vs kunjungan lalu', 'IGA Acne', 'Remarks berikutnya', 'Ritme kontrol', 'Sign-off dokter'].every(l => baru.includes(l)), baru);
    b.w.updateReq();
    check('F2 kontrol: gerbang obat melihat resep yang DIBAWA dari handoff (modal tak dibuka)', b.w._obatBerisiko().includes('Tretinoin 0,025%') && $(b.d, 'lbl_skrining').style.display !== 'none', b.w._obatBerisiko());
    set(b.d, 'k1_dokter', 'dr. Pengganti, Sp.DVE'); set(b.d, 'k1_hasil', 'Lesi aktif berkurang');
    b.w.setIGA('ac_iga', '1');
    check('F2: IGA delta=2 & sukses', (() => { const g = b.w.igaData('acne'); return g && g.baseline === 3 && g.kini === 1 && g.delta === 2 && g.sukses === true; })(), b.w.igaData('acne'));
    check('F2: label arah otomatis berbahasa ("Acne turun 2 (−2)")', /Acne turun 2 \(−2\)/.test($(b.d, 'k1_arah').value), $(b.d, 'k1_arah').value);
    check('F2 kontrol: rel menampilkan langkah 3 sebagai dilewati (tidak hilang)', /dilewati/.test(b.w.getComputedStyle($(b.d, 'rb2').querySelector('.rl'), '::after').content || '') || /body\.mode-kontrol #rb2 \.rl::after\{content:' — dilewati'/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')));
    set(b.d, 'k1_patuh', 'Patuh'); set(b.d, 'k1_es', 'Kulit kering ringan');
    set(b.d, 'd5_iv', '14'); set(b.d, 'd5_start', '2026-10-19'); set(b.d, 'd7_remarks', 'Lanjutkan'); set(b.d, 'd8_by', 'Perawat Uji'); await signoff(b); chk(b.d, 'd8_skrining'); chk(b.d, 'd8_consent');
    b.w.updateReq();
    const miss2 = b.w.reqStatus().filter(x => !x.ok).map(x => x.label);
    check('F2 kontrol: bar wajib lengkap', miss2.length === 0, miss2);
    b.dialogs.length = 0; await terbit(b);
    const h2 = fs.existsSync(path.join('data', RM)) ? disk('handoff_terakhir.json') : null;
    check('hub: kontrol membawa kode ICD dari handoff sebelumnya (dibawa: icd)', h2 && h2.asesmen.icd && h2.asesmen.icd[0].kode === 'L70.0' && (h2.asesmen.dibawa || []).includes('icd'), h2 && h2.asesmen.dibawa);
    check('hub: handoff #2 = kunjungan_ke 2, riwayat 1', h2 && h2.kunjungan_ke === 2 && h2.riwayat.length === 1, h2 && { k: h2.kunjungan_ke, r: h2.riwayat.length });
    check('hub: riwayat membawa kunjungan 1 (diagnosis, resep, temuan)', h2 && h2.riwayat[0] && h2.riwayat[0].kunjungan_ke === 1 && /Acne/.test(h2.riwayat[0].diagnosis || '') && /Tretinoin/.test(h2.riwayat[0].resep || '') && /tahap 1/.test(h2.riwayat[0].temuan_program || ''), h2 && h2.riwayat[0]);
    check('hub: evaluasi_kontrol.iga acne baseline 3 -> 1 sukses', h2 && h2.evaluasi_kontrol && h2.evaluasi_kontrol.iga && h2.evaluasi_kontrol.iga.acne && h2.evaluasi_kontrol.iga.acne.sukses === true && h2.evaluasi_kontrol.iga.acne.baseline === 3, h2 && h2.evaluasi_kontrol);
    check('hub: baseline IGA tetap 3 di program_detail (bukan 1)', h2 && h2.program_detail.acne.iga_baseline === 3 && h2.program_detail.acne.iga === 1, h2 && h2.program_detail.acne);
    check('hub: dokter pemeriksa kontrol = dokter pengganti (bukan pemilik lama)', h2 && h2.asesmen.dokter === 'dr. Pengganti, Sp.DVE', h2 && h2.asesmen.dokter);
    check('hub: jenis_kunjungan kontrol', h2 && h2.jenis_kunjungan === 'kontrol');
    check('hub: resep berjalan terbawa di kontrol (resep tidak hilang)', h2 && h2.asesmen.resep.length >= 1, h2 && h2.asesmen.resep);
    check('hub: kontrol mencatat apa yang dibawa (asesmen.dibawa)', h2 && Array.isArray(h2.asesmen.dibawa) && ['diagnosis', 'resep'].every(k => h2.asesmen.dibawa.includes(k)), h2 && h2.asesmen.dibawa);
    check('hub: kontrol membawa tahap program (tahap 1 tidak hilang)', h2 && h2.program_detail.acne.tahap == 1, h2 && h2.program_detail.acne);
    check('hub: kontrol tanpa buka form program -> isian dibawa dari handoff & tetap bersih', h2 && (() => { const t = h2.program_detail.acne.isian.join(' | '); return /Tretinoin 0,025%/.test(t) && !/Isotretinoin|Spironolactone/.test(t) && h2.asesmen.dibawa.includes('program_detail.acne'); })(), h2 && h2.program_detail.acne.isian);
    check('hub: kontrol membawa ciri menetap (tipe kulit) tapi BUKAN BB/TB/IMT lama', h1 && h2 && h1.asesmen.pemeriksaan.bb === '58' && h2.asesmen.pemeriksaan.tipe_kulit === 'Kombinasi, Sensitif' && !h2.asesmen.pemeriksaan.bb && !h2.asesmen.pemeriksaan.imt, h2 && h2.asesmen.pemeriksaan);
    check('hub: kontrol: derajat = IGA hari ini (tidak dibawa dari kunjungan lalu)', h2 && h2.asesmen.derajat === 'Acne IGA 1 · Hampir bersih (Almost clear)' && !h2.asesmen.dibawa.includes('derajat'), h2 && h2.asesmen.derajat);
    check('F2 kontrol: kotak alergi tampil (terisi dari handoff) & bisa diubah', $(b.d, 'alergi_box').style.display !== 'none' && $(b.d, 'alergi_flag').value === 'Penisilin');
    check('hub: pantangan dibawa ke kontrol & tampil di panel journey', h2 && h2.asesmen.hindari === 'Hindari scrub' && $(b.d, 'h_avoid').value === 'Hindari scrub', { h: h2 && h2.asesmen.hindari, panel: $(b.d, 'h_avoid').value });
    check('hub: alergi terbawa di kontrol', h2 && h2.asesmen.alergi === 'Penisilin', h2 && h2.asesmen.alergi);
    check('hub: diagnosis terbawa di kontrol', h2 && /Acne/.test(h2.asesmen.diagnosis || ''), h2 && h2.asesmen.diagnosis);

    /* ===== 5. KONTROL #3 (rantai) ===== */
    const c = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    muatRM(c, 'muatHandoffHub', RM); await until(() => c.w._prevHandoff);
    check('F2: handoff #2 dimuat (kunjungan_ke 2)', c.w._prevHandoff && c.w._prevHandoff.kunjungan_ke === 2);
    check('F2: IGA baseline di kunjungan 3 masih 3', c.w.igaData('acne') === null || c.w._igaBaseline('acne') === 3, c.w._igaBaseline('acne'));
    set(c.d, 'k1_dokter', 'dr. Uji, Sp.DVE'); set(c.d, 'k1_hasil', 'Stabil'); c.w.setIGA('ac_iga', '0');
    set(c.d, 'd5_iv', '14'); set(c.d, 'd5_start', '2026-11-02'); set(c.d, 'd7_remarks', 'Selesai'); await signoff(c, { batal: true });
    check('F2 D7: Batal pada PIN saat sign-off -> centang DILEPAS, chip amber "Belum ditandatangani"', /Belum ditandatangani/.test($(c.d, 'd8_ttd').textContent) && $(c.d, 'd8_ttd').classList.contains('warn') && !$(c.d, 'd8_signoff').checked && !c.w._ttd, $(c.d, 'd8_ttd').textContent);
    $(c.d, 'd8_signoff').checked = true;   /* centang tanpa dialog (mis. form lama) -> PIN diminta saat Terbitkan */
    check('WAJIB: butir Sign-off dokter membaca tanda tangan PIN (hub hidup) — centang tanpa PIN tetap BELUM', c.w.reqStatus().some(x => x.label === 'Sign-off dokter' && !x.ok));
    chk(c.d, 'd8_skrining'); chk(c.d, 'd8_consent');
    await terbit(c, { batal: true });
    const h3 = disk('handoff_terakhir.json');
    check('F2: Batal lagi pada dialog TTD saat Terbitkan -> konfirmasi lalu tetap terbit TANPA ttd (tercatat)', h3 && h3.penerbitan.ttd === null && /Terbitkan tanpa tanda tangan PIN\?.*Tanpa tanda tangan elektronik/.test(c.w.__tdlgUlang) && !c.dialogs.some(x => x.type === 'confirm') && /tanpa verifikasi PIN/.test(c.w.__popup.document.html), h3 && h3.penerbitan.ttd);
    check('hub: handoff #3 = kunjungan_ke 3, riwayat 2 (urut)', h3 && h3.kunjungan_ke === 3 && h3.riwayat.length === 2 && h3.riwayat[0].kunjungan_ke === 1 && h3.riwayat[1].kunjungan_ke === 2, h3 && { k: h3.kunjungan_ke, r: h3.riwayat.map(x => x.kunjungan_ke) });
    check('hub: riwayat kunjungan 2 membawa evaluasi (IGA) agar tren tak hilang', h3 && h3.riwayat[1] && h3.riwayat[1].evaluasi && h3.riwayat[1].evaluasi.iga, h3 && h3.riwayat[1]);
    check('hub: riwayat kunjungan 2 membawa diagnosis & resep (rantai utuh)', h3 && /Acne/.test(h3.riwayat[1].diagnosis || '') && /Tretinoin/.test(h3.riwayat[1].resep || ''), h3 && h3.riwayat[1]);
    check('hub: baseline tetap 3 di kunjungan 3', h3 && h3.program_detail.acne.iga_baseline === 3 && h3.program_detail.acne.iga === 0 && h3.program_detail.acne.iga_delta === 3, h3 && h3.program_detail.acne);
    check('hub: 3 berkas handoff berstempel + 1 terakhir', fs.readdirSync(path.join('data', RM)).filter(f => /^handoff_\d/.test(f)).length === 3);
    const lst = await (await fetch(BASE + '/api/pasien', { headers: Hd('cs') })).json();
    check('hub: daftar pasien menampilkan RM, nama, kunjungan 3, program', lst.pasien[0] && lst.pasien[0].rm === RM && lst.pasien[0].kunjungan_ke === 3 && /Acne/.test(lst.pasien[0].program), lst.pasien);

    /* ===== 5b. melasma & hair: isian hanya dari tahap terpilih, penilaian di luar blok tetap terekam ===== */
    const m = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    set(m.d, 'p_nama', 'Uji Program Lain'); set(m.d, 'rm', 'RM-TEST-002');
    m.w.setIGA('me_iga', '2'); chk(m.d, 'me_foto_ok'); m.w.pickStage('melasma', 'P');
    chk(m.d, 'hr_foto_ok'); m.w.pickStage('hair', 1);
    check('F2: memilih tahap tidak mencentang apa pun otomatis (tanpa centang bawaan)', [...m.d.querySelectorAll('#ovl_acne input[type=checkbox], #ovl_melasma input[type=checkbox], #ovl_hair input[type=checkbox]')].every(c => !c.defaultChecked) && !m.d.querySelector('#hr_blk-1 input:checked') && !m.d.querySelector('#me_block-P input:checked'));
    m.d.querySelector('#hr_blk-1 input[type=checkbox]').checked = true;
    const pdm = m.w.buildHandoff().program_detail;
    check('F2: melasma & hair aktif', !!pdm.melasma && !!pdm.hair, Object.keys(pdm));
    check('F2 melasma: isian hanya blok P (tidak ada isi blok A/M)', (() => {
      const own = [...m.d.querySelectorAll('#ovl_melasma .stage-block:not(#me_block-P) input')].map(e => (e.value || '').trim()).filter(Boolean);
      const t = pdm.melasma.isian.join('|'); return pdm.melasma.isian.length > 0 && own.every(v => !t.includes(v) || [...m.d.querySelectorAll('#me_block-P input')].some(e => (e.value || '').trim() === v));
    })(), pdm.melasma && pdm.melasma.isian);
    check('F2 melasma: foto klinis (di luar blok) tetap terekam', pdm.melasma.isian.some(x => /pencahayaan/i.test(x)), pdm.melasma.isian);
    check('F2 hair: foto klinis (di luar blok) tetap terekam', pdm.hair.isian.some(x => /pencahayaan/i.test(x)), pdm.hair.isian);
    check('F2 hair: isian dari blok tahap 1, tidak ada label blok tahap 2/3', (() => {
      const lab = sel => [...m.d.querySelectorAll(sel + ' label')].map(l => l.textContent.trim()).filter(Boolean);
      const own = lab('#hr_blk-1'), other = lab('#hr_blk-2').concat(lab('#hr_blk-3')).filter(x => !own.includes(x));
      return own.some(x => pdm.hair.isian.includes(x)) && other.every(x => !pdm.hair.isian.includes(x)) && other.length > 0;
    })(), pdm.hair.isian);

    /* ===== 5c. Derajat (IGA) dipilih SEBELUM program -> dipakai program begitu aktif ===== */
    const g = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    g.w.updateIgaCards();
    check('F2 derajat: kartu umum tampil sebelum ada program', $(g.d, 'igacard_umum').style.display !== 'none' && $(g.d, 'igacard_acne').style.display === 'none');
    g.w.setIGAUmum('d1_iga', '3');
    check('F2 derajat: pilih 3 sebelum program -> d2_derajat terisi, program belum aktif', /^IGA 3 · Sedang/.test($(g.d, 'd2_derajat').value) && !g.w.activeProgs().includes('acne'), $(g.d, 'd2_derajat').value);
    g.w.pickStage('acne', 1);
    check('F2 derajat: program Acne dipilih -> IGA acne = 3, nilai sementara dikosongkan, kartu umum hilang', $(g.d, 'ac_iga').value === '3' && $(g.d, 'd1_iga').value === '' && $(g.d, 'igacard_umum').style.display === 'none' && $(g.d, 'igacard_acne').style.display !== 'none', { ac: $(g.d, 'ac_iga').value, u: $(g.d, 'd1_iga').value });
    g.w.setIGA('ac_iga', '3');
    check('F2 derajat: ketuk ulang membatalkan skor program (tidak terisi lagi otomatis)', $(g.d, 'ac_iga').value === '', $(g.d, 'ac_iga').value);
    g.w.setIGA('ac_iga', '2');
    check('F2 derajat: d2_derajat dirangkum per program', $(g.d, 'd2_derajat').value === 'Acne IGA 2 · Ringan (Mild)' && g.w.buildHandoff().asesmen.derajat === 'Acne IGA 2 · Ringan (Mild)', $(g.d, 'd2_derajat').value);

    /* ===== 5d. regresi bug review 2026-10-09 ===== */
    { const h = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      h.w.setIGAUmum('d1_iga', '3'); h.w.pickStage('hair', 1);
      check('F2 derajat + Hair-Loss saja: nilai sementara dibuang, tidak masuk handoff', $(h.d, 'd1_iga').value === '' && h.w.buildHandoff().asesmen.derajat === '', h.w.buildHandoff().asesmen.derajat); }
    { const m2 = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      m2.w.setIGAUmum('d1_iga', '3');
      const cb = m2.d.querySelector('#ovl_melasma input[type=checkbox]'); cb.checked = true; m2.w.markProg('melasma');
      check('F2 derajat: menyentuh form Melasma (tanpa pilih tahap) TIDAK menyalin IGA', $(m2.d, 'me_iga').value === '' && $(m2.d, 'd1_iga').value === '3', { me: $(m2.d, 'me_iga').value });
      m2.w.pickStage('acne', 1);
      check('F2 derajat: dipakai program yang tahapnya dipilih (Acne)', $(m2.d, 'ac_iga').value === '3' && $(m2.d, 'me_iga').value === '' && $(m2.d, 'd1_iga').value === ''); }
    { const lo = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      lo.w.applyIntake({ doc: 'ADC-INTAKE', pasien: {}, kritis: { alergi: '', alergi_nihil: true }, penugasan: {}, pengukuran: {}, persetujuan: {} });
      lo.w._intake = null;
      lo.w.applyHandoff({ doc: 'ADC-HANDOFF', pasien: {}, asesmen: { alergi: 'Penisilin' } });
      check('F2: handoff beralergi menimpa "nihil" (tidak pernah keduanya)', $(lo.d, 'alergi_flag').value === 'Penisilin' && !$(lo.d, 'alergi_none').checked); }
    { const dl = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      let applied = 0; dl.w.applyIntake = () => { applied++; };
      let pending = null; dl.w.hubGetPasien = (rm, cb) => { pending = cb; };
      dl.w.muatIntakeHub(); dl.d.getElementById('mdlg_rm').value = RM; dl.d.getElementById('mdlg_ok').click(); dl.d.getElementById('mdlg_ok').click();
      dl.d.getElementById('mdlg_x').click();
      dl.w.muatHandoffHub();
      pending({ intake: { doc: 'ADC-INTAKE' } }, null);
      check('F2 dialog: Batal membatalkan — respons terlambat tidak memuat & tidak menutup dialog berikutnya', applied === 0 && dl.d.getElementById('mdlg').classList.contains('on'), { applied });
      dl.d.dispatchEvent(new dl.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      let escOk = !dl.d.getElementById('mdlg').classList.contains('on');
      dl.w.openProg('acne'); dl.d.dispatchEvent(new dl.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('F2 dialog: Esc menutup dialog, lalu tetap menutup form program (listener tidak bocor)', escOk && !dl.d.getElementById('ovl_acne').classList.contains('open')); }

    { const fm = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      fm.w.applyIntake({ doc: 'ADC-INTAKE', pasien: {}, kritis: { alergi_nihil: true }, penugasan: { foto_baseline: true, foto_area: 'Wajah' }, pengukuran: {}, persetujuan: {} });
      fm.w.pickStage('melasma', 'P');
      const fo = fm.w.metricStatus().find(m => m.label === 'Foto klinis Melasma');
      check('F2 Melasma: foto baseline dari Form 1 memenuhi syarat foto (tidak perlu dicentang ulang)', fo && fo.ok && !$(fm.d, 'me_foto_ok').checked && /Form 1/.test($(fm.d, 'me_foto_f1').textContent), fo); }

    { const pr = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      pr.w.applyIntake({ doc: 'ADC-INTAKE', pasien: { nama: 'Uji <b>X</b>', rm: 'RM-9' }, kritis: { alergi: 'Sulfa', keluhan: 'Jerawat' }, penugasan: { foto_baseline: true }, pengukuran: {}, persetujuan: { total: 2, disetujui: 2, tanda_tangan: { pasien: { nama: 'A', tanggal: '2026-10-10', gambar: 'data:image/png;base64,iVBORw0KGgo=' } } }, seksi: [{ kode: 'P4', isian: [{ k: 'Lokasi utama', v: 'Pipi' }] }] });
      set(pr.d, 'd2_dx', 'Acne vulgaris'); pr.w.pickStage('acne', 1);
      const el = pr.w._lembarCetak(), tx = el.textContent;
      check('Cetak: lembar 1 halaman memuat identitas, alergi, P4, diagnosis, program; nama di-escape', /Lembar Asesmen Dokter/.test(tx) && /Sulfa/.test(tx) && /Lokasi utama/.test(tx) && /Acne vulgaris/.test(tx) && /Tahap Ringan/.test(tx) && !el.querySelector('b b') && tx.includes('Uji <b>X</b>'), tx.slice(0, 200));
      check('F2: tanda tangan menampilkan titik tengah, bukan kode &middot;', !/&middot;/.test($(pr.d, 'intake_body').textContent) && /A · 2026-10-10/.test($(pr.d, 'intake_body').textContent)); }

    { const pg = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      const tick = (sel, txt) => { const l = [...pg.d.querySelectorAll(sel + ' label')].find(x => x.textContent.replace(/\s+/g, ' ').trim().startsWith(txt)); l.querySelector('input').checked = true; };
      pg.w.pickStage('acne', 2); pg.w.setIGA('ac_iga', '2');
      tick('#ovl_acne .ff-table', 'Kulit berminyak'); tick('#ovl_acne .ff-table', 'Metabolic Health'); tick('#ac_block-2', 'Excel V');
      tick('#ovl_acne .qline', 'Ya');
      pg.d.querySelector('#ovl_acne label.consent-item input').checked = true;
      pg.d.querySelector('#ovl_acne .tx-extra').value = 'Diet rendah GI';
      check('F2: treatment tambahan di tabel 4 faktor tersimpan di handoff (dulu hilang)', pg.w.buildHandoff().program_detail.acne.isian.includes('Faktor "Sebum berlebih" — treatment tambahan: Diet rendah GI'), pg.w.buildHandoff().program_detail.acne.isian.slice(-2));
      const box = pg.w._lembarCetak().querySelector('.ps-prog'), t = box.textContent;
      check('Cetak: program dikelompokkan (tahap, derajat, penyebab, rencana klinik, edukasi) tanpa jawaban Ya/Tidak',
        /Tahap Menengah–Berat/.test(t) && /Derajat hari ini: 2 · Ringan/.test(t) && /Penyebab yang ditemukan/.test(t) && /Sebum berlebih: kulit berminyak/.test(t) &&
        /Rencana perawatan di klinik/.test(t) && /Metabolic Health/.test(t) && /Excel V/.test(t) && /Sebum berlebih: Diet rendah GI/.test(t) &&
        /Sudah dijelaskan ke pasien/.test(t) && ![...box.querySelectorAll('li')].some(li => /^(Ya|Tidak)$/.test(li.textContent.trim())), t.slice(0, 300)); }

    /* ===== 5e. regresi review lembar cetak ===== */
    { /* kunjungan kontrol: tahap dari handoff, modal tak dibuka */
      const v1 = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      v1.w.pickStage('acne', 2); v1.w.setIGA('ac_iga', '3'); set(v1.d, 'rm', 'RM-K'); set(v1.d, 'd2_dx', 'Acne');
      const ho = v1.w.buildHandoff();
      const v2 = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      v2.w.applyHandoff(ho); v2.w.setIGA('ac_iga', '1');
      const t2 = v2.w._lembarCetak().textContent;
      check('Cetak kontrol: tahap dari handoff tampil & rencana dinyatakan dilanjutkan (bukan "belum ada tindakan")',
        /Tahap Menengah–Berat/.test(t2) && /Melanjutkan rencana perawatan/.test(t2) && !/Belum ada tindakan/.test(t2) && /awal 3 → membaik 2 tingkat/.test(t2), t2.slice(t2.indexOf('Program'), t2.indexOf('Program') + 260)); }
    { /* Hair: edukasi (tanpa .consent-item) & nama fase */
      const hh = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      hh.w.pickStage('hair', 1);
      const ed = [...hh.d.querySelectorAll('#ovl_hair .sec')].find(x => /Edukasi/.test((x.querySelector('.sech') || {}).textContent || ''));
      ed.querySelector('input[type=checkbox]').checked = true;
      const th = hh.w._lembarCetak().textContent;
      check('Cetak Hair: edukasi tercetak & nama fase (bukan "Tahap Fase")', /Sudah dijelaskan ke pasien/.test(th) && /Tipe kerontokan/.test(th) && /Fase 1 · Active Stimulation/.test(th) && !/Tahap Fase/.test(th), th.slice(th.indexOf('Hair'), th.indexOf('Hair') + 200)); }
    { /* singkatan tetap kapital; ritme tidak dicetak bila hanya durasi bawaan */
      const ab = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      ab.w.pickStage('acne', 1);
      const l = [...ab.d.querySelectorAll('#ovl_acne .ff-table label')].find(x => /Diet tinggi GI/.test(x.textContent)); l.querySelector('input').checked = true;
      const ta = ab.w._lembarCetak().textContent;
      check('Cetak: singkatan (GI) tetap kapital; ritme kosong tidak dicetak "3 bulan"', /diet tinggi GI/.test(ta) && !/Ritme kontrol/.test(ta), ta.slice(ta.indexOf('Penyebab'), ta.indexOf('Penyebab') + 120)); }
    { /* tanda tangan dari berkas intake: hanya data:image, tidak bisa menyisipkan atribut */
      const xs = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      xs.w.applyIntake({ doc: 'ADC-INTAKE', pasien: {}, kritis: {}, penugasan: {}, pengukuran: {}, persetujuan: { total: 1, disetujui: 1, tanda_tangan: { pasien: { nama: 'Z', gambar: 'x" onerror="window.__xss=1' } } } });
      check('Keamanan: tanda tangan bukan data:image ditolak (tidak ada <img onerror>)', !xs.d.querySelector('#intake_body img') && !xs.d.querySelector('[onerror]') && !xs.w.__xss); }

    { const lg = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      lg.w.applyIntake({ doc: 'ADC-INTAKE', pasien: { nama: 'Lama' }, kritis: { alergi_nihil: true }, penugasan: { foto_baseline: true }, pengukuran: {}, persetujuan: {} });
      check('F2: intake lama (tanpa foto_izin) tidak diberi label "belum dicatat"', !/belum dicatat/.test($(lg.d, 'intake_body').textContent) && !/izin lisan/.test($(lg.d, 'intake_body').textContent)); }
    { const ok = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      const oral = [...ok.d.querySelectorAll('#ac_block-2 .rx-table')].pop().querySelectorAll('tbody tr td:first-child input');
      const ph = [...oral].map(i => i.getAttribute('data-ph') || i.placeholder);
      check('Acne selaras Dr. Oku: isotretinoin low-dose pertama, antibiotik terakhir & jangka pendek, tanpa kotak peringatan, BPO dulu, triase risiko bekas, Panduan §8',
        /^Isotretinoin low-dose/.test(ph[0]) && /Antibiotik oral — jangka pendek/.test(ph[ph.length - 1]) && !ok.d.querySelector('#ac_block-2 .warn-box') /* kotak peringatan dihapus 2026-10-23 atas permintaan; rinciannya di Panduan §8 */ &&
        [...ok.d.querySelectorAll('#ovl_acne .rx-table input')].some(i => /^BPO 2,5/.test(i.getAttribute('data-ph') || '')) && [...ok.d.querySelectorAll('#ovl_acne .qline .q')].some(q => /risiko bekas/i.test(q.textContent)) &&
        /id="oku"/.test(fs.readFileSync(path.join('www', 'ADC_Panduan_Pengisian_Form.html'), 'utf8')), ph); }
    /* ===== 5h. pemilih produk resep ===== */
    { const rp = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      const tbs = [...rp.d.querySelectorAll('#ac_block-2 .rx-table')];
      check('Rx picker: daftar produk tersuntik (>=170) & tombol ▾ hanya di tabel topikal (bukan Obat Minum)', rp.w.ADC_PRODUK.length >= 170 && tbs[0].querySelectorAll('.rxpick-btn').length === 3 && tbs[tbs.length - 1].querySelectorAll('.rxpick-btn').length === 0 && rp.d.querySelectorAll('#hr_rxTable .rxpick-btn').length >= 4, { n: rp.w.ADC_PRODUK.length });
      rp.w.pickStage('acne', 1);
      const inp = rp.d.querySelector('#ac_block-1 .rx-table tbody tr td input');
      rp.w.openRxPick(inp);
      check('Rx picker: terbuka dengan tab kategori sesuai program (Acne)', rp.d.getElementById('rxpick').classList.contains('on') && rp.w._rxKat === 'Acne' && rp.d.querySelectorAll('#rxp_list .rxp-it').length > 20);
      const q = rp.d.getElementById('rxp_q'); q.value = 'benzopalene'; q.dispatchEvent(new rp.w.Event('input', { bubbles: true }));
      const hits = rp.d.querySelectorAll('#rxp_list .rxp-it');
      check('Rx picker: pencarian menyaring', hits.length === 1 && /Benzopalene/.test(hits[0].textContent));
      hits[0].click();
      const ins = inp.closest('tr').querySelectorAll('input');
      check('Rx picker: pilih produk mengisi nama + jadwal + cara pakai, dialog tertutup, resep terekam', /Benzopalene/.test(ins[0].value) && ins[1].value === 'Pagi atau Malam' && /totol/.test(ins[2].value) && !rp.d.getElementById('rxpick').classList.contains('on') && rp.w.collectRx().some(r => /Benzopalene/.test(r.obat)), [...ins].map(i => i.value));
      const inp2 = rp.d.querySelectorAll('#ac_block-1 .rx-table tbody tr:not(.rx-saran)')[1].querySelector('td input');
      rp.w.openRxPick(inp2); const q2 = rp.d.getElementById('rxp_q'); q2.value = 'Night Cream B 10'; q2.dispatchEvent(new rp.w.Event('input', { bubbles: true }));
      check('Rx picker: pencarian tanpa hasil di tab Acne jatuh ke semua kategori (dengan catatan)', rp.w._rxKat === 'Acne' && /menampilkan semua kategori/.test(rp.d.getElementById('rxp_list').textContent) && rp.d.querySelectorAll('#rxp_list .rxp-it').length === 1);
      rp.d.querySelector('#rxp_list .rxp-it').click();
      check('Gerbang obat membaca KANDUNGAN produk yang dipilih (Night Cream B = tretinoin)', rp.w._obatBerisiko().some(x => /Night Cream B.*tretinoin/i.test(x)), rp.w._obatBerisiko()); }

    /* ===== 5f. gerbang keamanan D7 ===== */
    { const gt = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      gt.w.applyIntake({ doc: 'ADC-INTAKE', pasien: { nama: 'Bumil', rm: 'RM-GATE' }, kritis: { alergi_nihil: true, hormonal: ['Sedang hamil'], flags: ['SEDANG HAMIL'] }, penugasan: {}, pengukuran: {}, persetujuan: {} });
      set(gt.d, 'd2_dx', 'Acne'); gt.w.pickStage('acne', 1);
      const rx = gt.d.querySelectorAll('#ac_block-1 .rx-table tbody tr:not(.rx-saran)')[0].querySelectorAll('input'); rx[0].value = 'Isotretinoin 20 mg'; rx[1].value = '1x1';
      [...gt.d.querySelectorAll('#ac_block-1 label.chk-item')].find(l => /Peeling/.test(l.textContent)).querySelector('input').checked = true;
      await signoff(gt, { batal: true }); chk(gt.d, 'alergi_none'); gt.w.updateReq();
      check('Gerbang: bendera HAMIL tampil di D0 dan di atas cermin resep D3 (menyebut obat berisiko), baris Isotretinoin ditandai ⚠, baris skrining berbingkai merah',
        $(gt.d, 'hamil_box').style.display !== 'none' && /SEDANG HAMIL/.test($(gt.d, 'hamil_v').textContent) && $(gt.d, 'hamil_box_rx').style.display !== 'none' && /Isotretinoin/.test($(gt.d, 'hamil_rx_v').textContent) &&
        !!gt.d.querySelector('#d4_rx tr.rx-risk .rk') && /Isotretinoin/.test(gt.d.querySelector('#d4_rx tr.rx-risk').textContent) && $(gt.d, 'lbl_skrining').classList.contains('lbl-hamil') && /PASIEN SEDANG HAMIL/.test($(gt.d, 'skrining_obat').textContent),
        { v: $(gt.d, 'hamil_rx_v').textContent, sk: $(gt.d, 'skrining_obat').textContent });
      check('Gerbang: pasien tidak hamil -> bendera tersembunyi, baris resep tidak ditandai', $(a.d, 'hamil_box').style.display === 'none' && !a.d.querySelector('#d4_rx tr.rx-risk'));
      /* di DALAM modal: pita di atas tiap tabel resep, baris Isotretinoin ditandai, chip di strip konteks */
      gt.w.openProg('acne');
      const bands = [...gt.d.querySelectorAll('#ovl_acne .rxhamil')];
      check('Gerbang modal: strip konteks menyebut PASIEN SEDANG HAMIL; pita hamil di atas tiap tabel resep Acne; baris Isotretinoin ditandai rx-risk', /PASIEN SEDANG HAMIL/.test($(gt.d, 'ctx_acne').textContent) && bands.length === gt.d.querySelectorAll('#ovl_acne .rx-table').length && bands.every(b => !b.hidden) && gt.d.querySelector('#ac_block-1 .rx-table tbody tr:first-child').classList.contains('rx-risk'), { bands: bands.length, hidden: bands.map(b => b.hidden) });
      { const r2 = gt.d.querySelectorAll('#ac_block-1 .rx-table tbody tr:not(.rx-saran)')[1], i2 = r2.querySelector('input'); i2.value = 'Niacinamide 5%'; i2.dispatchEvent(new gt.w.Event('input', { bubbles: true }));
        const aman = !r2.classList.contains('rx-risk'); i2.value = 'Tretinoin 0,05%'; i2.dispatchEvent(new gt.w.Event('input', { bubbles: true }));
        check('Gerbang modal: baris ditandai LANGSUNG saat obat berisiko diketik (Niacinamide aman, Tretinoin ditandai)', aman && r2.classList.contains('rx-risk')); }
      check('Gerbang modal: pasien tidak hamil -> pita tersembunyi & tidak ada baris ditandai', (a.w.openProg('acne'), [...a.d.querySelectorAll('#ovl_acne .rxhamil')].every(b => b.hidden) && !a.d.querySelector('#ovl_acne tr.rx-risk') && !/HAMIL/.test($(a.d, 'ctx_acne').textContent)));
      a.w.closeProg('acne'); gt.w.closeProg('acne');
      /* wizard 3 bagian di dalam modal */
      { const parts = p => [...a.d.querySelectorAll('#ovl_' + p + ' .pmpart')].map(w => w.getAttribute('data-part')).join(',');
        check('Modal wizard: Acne 5 bagian (1,2,3,4,5: tahap & blok tahap terpisah), Melasma 4 (1,2,3,5), Hair 4 + rel + navigasi; label per program', parts('acne') === '1,2,3,4,5' && parts('melasma') === '1,2,3,5' && parts('hair') === '1,2,3,4' && a.d.querySelectorAll('#ovl_acne .pmrail button').length === 5 && a.d.querySelectorAll('#ovl_acne .pmnav').length === 5 && /Resep & prosedur/.test(a.d.querySelector('#ovl_acne .pmrail button[data-part="4"]').textContent) && /Resep/.test(a.d.querySelector('#ovl_melasma .pmrail button[data-part="3"]').textContent) && a.d.querySelector('#me_block-A').closest('.pmpart').getAttribute('data-part') === '3' && a.d.querySelector('#me_sev-A').closest('.pmpart').getAttribute('data-part') === '2' && /4 faktor/.test(a.d.querySelector('#ovl_acne .pmrail button[data-part="2"]').textContent) && /Pilar/.test(a.d.querySelector('#ovl_melasma .pmrail button[data-part="2"]').textContent) && /Resep & rujukan/.test(a.d.querySelector('#ovl_hair .pmrail button[data-part="3"]').textContent), { acne: parts('acne'), mel: parts('melasma'), hair: parts('hair') });
        a.w.openProg('acne');
        const on = () => a.d.querySelector('#ovl_acne .pmpart.on').getAttribute('data-part');
        check('Modal wizard: dibuka di bagian 1; A & B di bagian 1, tabel 4 faktor di 2, kartu tahap di 3, blok tahap (resep) di 4, edukasi di 5', on() === '1' && a.d.querySelector('#ovl_acne .rbf').closest('.pmpart').getAttribute('data-part') === '1' && a.d.querySelector('#ovl_acne .ff-table').closest('.pmpart').getAttribute('data-part') === '2' && a.d.querySelector('#ac_sev-2').closest('.pmpart').getAttribute('data-part') === '3' && a.d.querySelector('#ac_block-2').closest('.pmpart').getAttribute('data-part') === '4' && a.d.querySelector('#ovl_acne label.consent-item').closest('.pmpart').getAttribute('data-part') === '5' && /position:sticky;top:var\(--pmh/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8').match(/\.ovl \.pmrail\{display:grid[^}]*\}/)[0]));
        { const f0 = a.d.querySelector('#ovl_acne .rbf'); f0.checked = true; f0.dispatchEvent(new a.w.Event('change', { bubbles: true })); }
        a.d.querySelector('#ovl_acne .pmpart[data-part="1"] .pmnav .pri').click();
        check('Modal wizard: tombol Lanjut -> bagian 2, rel menandai bagian aktif, bagian 1 "terisi"', on() === '2' && a.d.querySelector('#ovl_acne .pmrail button[data-part="2"]').classList.contains('on') && a.d.querySelector('#ovl_acne .pmrail button[data-part="1"]').classList.contains('done'));
        a.w.pmGo('acne', 3);
        check('Modal wizard: isian bagian tersembunyi tetap terbaca handoff (resep bagian 2 saat bagian 3 aktif)', on() === '3' && a.w.collectRx().some(r => /Tretinoin/.test(r.obat)) && a.w._progDetail().acne.isian.some(x => /Kesimpulan risiko bekas|Tretinoin/.test(x)));
        check('Modal wizard: bagian terakhir berakhir dengan "Selesai — tutup & simpan"; footer modal hanya Cetak (garis), tanpa Tutup ganda; .pm-selesai terakota bukan tinta', /Selesai/.test(a.d.querySelector('#ovl_acne .pmpart[data-part="5"] .pmnav .pm-selesai').textContent) && ['acne', 'melasma', 'hair'].every(p => a.d.querySelectorAll('#ovl_' + p + ' .pmfoot button').length === 1 && !a.d.querySelector('#ovl_' + p + ' .pmfoot .ghost')) && /\.ovl \.pmnav button\.pm-selesai\{background:var\(--accent-act\)/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')) && /\.pmfoot button\{[^}]*background:#fff;color:var\(--ink\);\}/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')));
        a.w.closeProg('acne'); a.w.openProg('acne');
        check('Modal wizard: dibuka lagi -> kembali ke bagian terakhir yang dilihat', on() === '3'); a.w.closeProg('acne'); }
      gt.dialogs.length = 0; gt.w.issueHandoff(); await sleep(300);
      const cfItems = [...gt.d.querySelectorAll('#tdlg_miss button, #tdlg_miss .plain')].map(b => b.textContent); const cf = cfItems.join('\n'); gt.d.getElementById('tdlg_x').click();
      check('Gerbang: Terbitkan memperingatkan obat berisiko + consent tindakan; pasien hamil ditandai PALING ATAS',
        /Obat berisiko.*Isotretinoin/.test(cf) && /Informed consent tindakan/.test(cf) && /^PASIEN SEDANG HAMIL/.test(cfItems[0] || '') && !gt.dialogs.some(x => x.type === 'confirm') && gt.d.querySelector('#tdlg_miss button[data-go="d8_skrining"]') !== null, cf.slice(0, 260));
      const hg = gt.w.buildHandoff(); const k2 = await open('ADC_Form2_Asesmen_Umum_Dokter.html'); k2.w.applyHandoff(hg);
      check('Gerbang kontrol: status hamil dirantai lewat handoff (tanpa Form 1) & obat dari isian lalu tetap terdeteksi', k2.w._pasienHamilMenyusui() === 'Sedang hamil' && k2.w._obatBerisiko().some(x => /Isotretinoin/.test(x)), { hm: k2.w._pasienHamilMenyusui(), ob: k2.w._obatBerisiko() });
      check('Gerbang kontrol: bendera HAMIL langsung tampil setelah Muat Handoff, dengan obat yang dibawa', $(k2.d, 'hamil_box').style.display !== 'none' && /Isotretinoin/.test($(k2.d, 'hamil_rx_v').textContent), $(k2.d, 'hamil_rx_v').textContent); }

    /* ===== 5g. Slimming (Sp.GK) & Tracker lewat hub ===== */
    { const sl = await open('ADC_Form_Asesmen_Slimming_SpGK.html');
      check('Slimming: hub tersambung & webhook terisi dari hub', sl.w._hubOn === true && $(sl.d, 'cfg_webhook').value === 'https://hook.test/adc', { on: sl.w._hubOn, wh: $(sl.d, 'cfg_webhook').value });
      muatRM(sl, 'muatIntakeHub', RM); await until(() => sl.w._intake);
      check('Slimming: Muat Form 1 (RM) mengisi identitas, alergi, BB/TB & ringkasan', $(sl.d, 'nama').value === 'Pasien Uji Coba' && $(sl.d, 'no_rm').value === RM && $(sl.d, 'alergi').value === 'Penisilin' && $(sl.d, 'b_bb').value === '58' && $(sl.d, 'ik_sec').style.display === 'block' && /Penisilin/.test($(sl.d, 'ik_body').textContent), { nama: $(sl.d, 'nama').value, bb: $(sl.d, 'b_bb').value });
      sl.dialogs.length = 0; sl.w.issueHandoff();
      await until(() => fs.existsSync(path.join('data', RM, 'handoff_terakhir_slimming.json')), 4000);
      const hs = disk('handoff_terakhir_slimming.json');
      const hk = disk('handoff_terakhir.json');
      check('Slimming: handoff tersimpan di rantai sendiri; handoff Skin Quality RM yang sama TIDAK tertimpa', hs.sumber === 'ADC-SLIMMING-4FAKTOR' && hs.pasien.rm === RM && hk.sumber === 'ADC-FORM2-UMUM' && hk.kunjungan_ke === 3, { slim: hs.sumber, skin: hk.sumber });
      await until(() => sl.dialogs.some(x => x.type === 'alert' && /tersimpan di hub/.test(x.msg)), 3000);
      check('Slimming: Terbitkan memberi pesan ✓ tersimpan di hub', sl.dialogs.some(x => x.type === 'alert' && /✓ Handoff Slimming tersimpan di hub/.test(x.msg)));
      const s2 = await open('ADC_Form_Asesmen_Slimming_SpGK.html'); muatRM(s2, 'muatHandoffHub', RM); await until(() => s2.w._prevHandoff);
      check('Slimming: Muat Handoff (RM) mengambil rantai Slimming, bukan Skin Quality', s2.w._prevHandoff && s2.w._prevHandoff.sumber === 'ADC-SLIMMING-4FAKTOR');
      const f2s = await open('ADC_Form2_Asesmen_Umum_Dokter.html'); f2s.w.applyHandoff(hs);
      check('F2: menolak handoff Slimming (program lain)', !f2s.w._prevHandoff && f2s.dialogs.some(x => x.type === 'alert' && /SLIMMING/.test(x.msg)));
      const tr = await open('ADC_SkinQualityProgram_Journey_Outcome_Tracker.html');
      muatRM(tr, 'muatHandoffHub', RM); await until(() => tr.w._ho);
      check('Tracker: Muat handoff terakhir lewat hub (RM) -> kunjungan ke-3', tr.w._ho && tr.w._ho.pasien.rm === RM && tr.w._ho.kunjungan_ke === 3, tr.w._ho && tr.w._ho.kunjungan_ke);
      check('Hub: halaman depan menautkan 6 halaman (F1, F2, Slimming, Tracker, Panduan, Pengguna)', (fs.readFileSync(path.join('www', 'index.html'), 'utf8').match(/class="card"/g) || []).length === 6); }

    { const ra = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      set(ra.d, 'd2_dx', 'Acne'); ra.w.pickStage('acne', 2);
      const tabs = [...ra.d.querySelectorAll('#ovl_acne .rx-table, #ovl_melasma .rx-table, #hr_rxTable')];
      { const me = ['P','A','M'].map(k => [...ra.d.querySelectorAll('#me_block-' + k + ' .rx-table')]);
        check('Melasma: tiap tahap punya tabel Cream + tabel Obat Minum terpisah (Tranexamic di oral, bukan di cream)', me.every(t => t.length === 2 && !/Dosis/.test(t[0].querySelector('thead').textContent) && /Dosis/.test(t[1].querySelector('thead').textContent) && ![...t[0].querySelectorAll('input')].some(i => /Tranexamic/.test(i.getAttribute('data-ph') || '')) && [...t[1].querySelectorAll('input')].some(i => /Tranexamic/.test(i.getAttribute('data-ph') || '')) && !t[1].querySelector('.rxpick-btn') && !!t[0].querySelector('.rxpick-btn')), me.map(t => t.length)); }
      check('Rx: tiap tabel resep (cream, obat minum, hair) punya tombol + Tambah baris', tabs.length > 0 && tabs.every(t => t.nextElementSibling && t.nextElementSibling.classList.contains('rxadd')), tabs.length);
      const oral = [...ra.d.querySelectorAll('#ac_block-2 .rx-table')].find(t => /Dosis/.test(t.querySelector('thead').textContent)), cream = ra.d.querySelector('#ac_block-2 .rx-table');
      const n0 = oral.querySelectorAll('tbody tr').length; oral.nextElementSibling.click(); const trO = oral.querySelector('tbody tr:last-child');
      cream.nextElementSibling.click(); const trC = cream.querySelector('tbody tr:last-child');
      check('Rx: baris baru kosong (4 input, tanpa placeholder), oral tanpa ▾, cream dengan ▾, ada tombol hapus', oral.querySelectorAll('tbody tr').length === n0 + 1 && trO.querySelectorAll('input').length === 4 && [...trO.querySelectorAll('input')].every(i => i.value === '' && i.placeholder === '') && !trO.querySelector('.rxpick-btn') && !!trC.querySelector('.rxpick-btn') && !!trO.querySelector('.rxdel'), { o: trO.innerHTML.slice(0, 120) });
      const oi = trO.querySelectorAll('input'); oi[0].value = 'Azithromycin 500 mg'; oi[1].value = '1x1 3 hari'; oi[3].value = '1 minggu';
      const ci = trC.querySelectorAll('input'); ci[0].value = 'Krim racik'; ci[1].value = 'Malam';
      const rx = ra.w.collectRx();
      check('Rx: baris tambahan terbaca collectRx & isian program', rx.some(r => r.obat === 'Azithromycin 500 mg' && r.jadwal === '1x1 3 hari') && rx.some(r => r.obat === 'Krim racik') && ra.w._progDetail().acne.isian.some(x => /Azithromycin/.test(x)), rx);
      trO.querySelector('.rxdel').click();
      check('Rx: hapus baris tambahan', oral.querySelectorAll('tbody tr').length === n0 && !ra.w.collectRx().some(r => /Azithromycin/.test(r.obat)));
      { const tb2 = ra.w.tambahBarisRx(oral); check('Rx: baris tambahan tidak mewarisi rx-kosong (tetap tampil)', !!tb2 && !tb2.classList.contains('rx-kosong') && tb2.classList.contains('rx-added')); tb2.remove(); }
      /* saran protokol */
      { const rows = [...oral.querySelectorAll('tbody tr:not(.rx-saran)')].filter(r => r.getAttribute('data-saran-ok')), sarans = oral.querySelectorAll('tbody tr.rx-saran');
        const in0 = rows[0].querySelectorAll('input');
        check('Rx saran: tiap baris oral punya baris "Saran protokol" (tanpa input), kolom input hanya petunjuk kategori, placeholder asli di data-ph', sarans.length === rows.filter(r => r.querySelector('input').getAttribute('data-ph')).length && [...sarans].every(s => !s.querySelector('input')) && in0[0].placeholder === 'obat minum' && /^Isotretinoin low-dose/.test(in0[0].getAttribute('data-ph')) && /Isotretinoin low-dose/.test(sarans[0].textContent), { s: sarans.length, ph: in0[0].placeholder });
        check('Rx saran: tanpa diketik, resep tetap KOSONG (saran bukan resep)', !ra.w.collectRx().some(r => /Isotretinoin/.test(r.obat)));
        check('Rx dinding: baris isian kosong tersembunyi (rx-kosong) selama ada saran; CSS display:none', rows.every(r => r.classList.contains('rx-kosong')) && /\.ovl tr\.rx-kosong\{display:none;\}/.test(fs.readFileSync(path.join('www', 'ADC_Form2_Asesmen_Umum_Dokter.html'), 'utf8')));
        sarans[0].querySelector('.rs-pakai').click();
        check('Rx saran: Pakai mengisi 4 kolom sebagai nilai, baris saran tersembunyi, baris isian tampil, resep & isian handoff memuatnya', in0[0].value === in0[0].getAttribute('data-ph') && /0,25/.test(in0[1].value) && sarans[0].classList.contains('used') && !rows[0].classList.contains('rx-kosong') && ra.w.collectRx().some(r => /^Isotretinoin low-dose/.test(r.obat) && /0,25/.test(r.jadwal)), { v: in0[0].value });
        in0[0].value = ''; in0[0].dispatchEvent(new ra.w.Event('input', { bubbles: true }));
        check('Rx saran: mengosongkan kolom obat memunculkan saran lagi (baris isian tersembunyi lagi)', !sarans[0].classList.contains('used') && rows[0].classList.contains('rx-kosong'));
        check('Rx saran: baris cream juga punya saran; tabel hair tidak', ra.d.querySelectorAll('#ac_block-2 .rx-table')[0].querySelector('tr.rx-saran') !== null && ra.d.querySelector('#hr_rxTable tr.rx-saran') === null); } }

    { const rb = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      set(rb.d, 'd2_dx', 'Acne'); rb.w.pickStage('acne', 2);
      const f = [...rb.d.querySelectorAll('#ovl_acne .rbf')], lv = () => ([...rb.d.querySelectorAll('input[name=rb_level]')].find(r => r.checked) || {}).value || '';
      { const yn = [...rb.d.querySelectorAll('.ovl .rbseg.yn')]; const q = t => yn.find(s => ((s.previousElementSibling || {}).textContent || '').trim() === t);
        const fam = q('Riwayat keluarga jerawat/bekas?'), pih = q('Mudah menghitam (PIH)?');
        const pick = (sg, lab) => { const i = [...sg.querySelectorAll('label')].find(l => l.textContent.trim() === lab).querySelector('input'); i.checked = true; i.dispatchEvent(new rb.w.Event('change', { bubbles: true })); };
        pick(fam, 'Tidak'); pick(pih, 'Ya');
        const isi = rb.w._progDetail().acne.isian;
        check('Ya/Tidak: 6 pasangan jadi radio berchip (satu jawaban, urutan Ya -> Tidak, tanpa checkbox Ya/Tidak tersisa); dua pertanyaan satu baris terekam masing-masing', yn.length === 6 && !!fam && !!pih && fam.querySelectorAll('input[type=radio]').length === 2 && fam.querySelector('label').textContent.trim() === 'Ya' && [...fam.querySelectorAll('input')].filter(i => i.checked).length === 1 && fam.querySelectorAll('.rbopt.on').length === 1 && isi.includes('Riwayat keluarga jerawat/bekas?: Tidak') && isi.includes('Mudah menghitam?: Ya') && ![...rb.d.querySelectorAll('.ovl label.ck')].some(l => /^(Ya|Tidak)$/.test(l.textContent.trim())), { n: yn.length, isi: isi.filter(x => /Riwayat keluarga|Mudah menghitam/.test(x)) }); }
      check('Risiko bekas: awal tanpa kesimpulan (tidak ada centang bawaan), konsekuensi tersembunyi', lv() === '' && $(rb.d, 'rb_conseq').hidden === true && /belum disimpulkan/.test($(rb.d, 'rb_saran').textContent));
      f[1].checked = true; f[1].dispatchEvent(new rb.w.Event('change', { bubbles: true }));
      check('Risiko bekas: 1 faktor -> saran Sedang terpilih otomatis + konsekuensi tampil', lv() === 'Sedang' && $(rb.d, 'rb_conseq').hidden === false && /SEDANG/.test($(rb.d, 'rb_conseq_lv').textContent));
      f[2].checked = true; f[2].dispatchEvent(new rb.w.Event('change', { bubbles: true }));
      check('Risiko bekas: 2 faktor -> Tinggi; isian handoff memuat "Kesimpulan risiko bekas: Tinggi" dan faktornya', lv() === 'Tinggi' && rb.w._progDetail().acne.isian.includes('Kesimpulan risiko bekas: Tinggi') && rb.w._progDetail().acne.isian.includes('Badan (dada/punggung)'), rb.w._progDetail().acne.isian);
      const rS = [...rb.d.querySelectorAll('input[name=rb_level]')].find(r => r.value === 'Sedang'); rS.checked = true; rS.dispatchEvent(new rb.w.Event('change', { bubbles: true }));
      check('Risiko bekas: dokter menimpa ke Sedang -> tercatat sebagai timpaan, saran tetap Tinggi', lv() === 'Sedang' && rb.w._rbOverride === true && /saran dari faktor: Tinggi/.test($(rb.d, 'rb_saran').textContent) && rb.d.querySelector('#rb_seg .rbopt.saran input').value === 'Tinggi', $(rb.d, 'rb_saran').textContent);
      f[2].checked = false; f[2].dispatchEvent(new rb.w.Event('change', { bubbles: true }));
      check('Risiko bekas: timpaan dokter bertahan saat faktor berubah', lv() === 'Sedang');
      f[0].checked = true; f[0].dispatchEvent(new rb.w.Event('change', { bubbles: true })); const rT = [...rb.d.querySelectorAll('input[name=rb_level]')].find(r => r.value === 'Tinggi'); rT.checked = true; rT.dispatchEvent(new rb.w.Event('change', { bubbles: true }));
      check('Risiko bekas: Nodulokistik -> saran Tinggi; memilih sesuai saran menghapus status timpaan', lv() === 'Tinggi' && rb.w._rbOverride === false, $(rb.d, 'rb_saran').textContent);
      check('Risiko bekas: hanya satu kesimpulan (radio), tiga pilihan', rb.d.querySelectorAll('input[name=rb_level]').length === 3 && rb.d.querySelectorAll('input[name=rb_level]:checked').length === 1); }

    { const pf = await open('ADC_Form2_Asesmen_Umum_Dokter.html'); await sleep(300);
      const nmHub = pf.w._hubUser && (pf.w._hubUser.nama || pf.w._hubUser.id);
      check('Nama dokter: d1_dokter terisi dari akun hub berperan dokter; d8_dokter terisi saat masuk langkah sign-off', !!nmHub && $(pf.d, 'd1_dokter').value === nmHub && (() => { pf.w.goStep(4); return $(pf.d, 'd8_dokter').value === nmHub; })(), { nmHub, d1: $(pf.d, 'd1_dokter').value, d8: $(pf.d, 'd8_dokter').value });
      set(pf.d, 'd1_dokter', 'dr. Lain'); $(pf.d, 'd8_dokter').value = ''; pf.w.goStep(3); pf.w.goStep(4);
      check('Nama dokter: dokter pemeriksa yang diketik menang atas akun hub untuk penandatangan', $(pf.d, 'd8_dokter').value === 'dr. Lain');
      set(pf.d, 'rm', 'RM-TTD-NAMA'); await signoff(pf);
      check('Nama dokter: stempel PIN menimpa nama prefill — penanda tangan = pemilik PIN', !!pf.w._ttd && $(pf.d, 'd8_dokter').value === pf.w._ttd.nama && pf.w._ttd.nama !== 'dr. Lain', { d8: $(pf.d, 'd8_dokter').value, ttd: pf.w._ttd && pf.w._ttd.nama }); }
    { const ri = await open('ADC_Form2_Asesmen_Umum_Dokter.html', { user: null });
      ri.w.localStorage.removeItem('adc_hub_id'); ri.w._ldlg('login', {}, function () {}); const kosong = $(ri.d, 'ldlg_id').value; $(ri.d, 'ldlg_x').click();
      ri.w.localStorage.setItem('adc_hub_id', 'dokter'); ri.w._ldlg('login', {}, function () {}); await sleep(30);
      check('ID diingat: tanpa riwayat kolom ID kosong; dengan adc_hub_id dialog memprefill ID dan memfokuskan PIN', kosong === '' && $(ri.d, 'ldlg_id').value === 'dokter' && ri.d.activeElement && ri.d.activeElement.id === 'ldlg_pin', { kosong, id: $(ri.d, 'ldlg_id').value, af: ri.d.activeElement && ri.d.activeElement.id });
      $(ri.d, 'ldlg_pin').value = PIN.dokter; $(ri.d, 'ldlg_ok').click(); await until(() => !!ri.w._hubUser, 3000);
      check('ID diingat: login sukses menyimpan adc_hub_id', !!ri.w._hubUser && ri.w.localStorage.getItem('adc_hub_id') === 'dokter'); }
    { const ar = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      const named = e => e.hasAttribute('aria-label') || e.hasAttribute('aria-labelledby') || (e.id && !!ar.d.querySelector('label[for="' + e.id + '"]')) || !!e.closest('label');
      const fields = [...ar.d.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea')];
      const unnamed = fields.filter(e => !named(e));
      ar.w.openICD(); const icd = ar.d.querySelector('#icdlg .mdlg'); ar.w.closeICD();
      ar.w.setIGAUmum('d1_iga', '2'); await sleep(20);
      const rx0 = ar.d.querySelector('#ac_block-2 .rx-table tbody tr td input');
      check('A11y nama: semua isian teks punya nama (label/aria), dialog ICD ber-aria-labelledby, IGA aria-pressed, .sec = heading 2, .page = main, chip HUB = <button>; isian resep dinamai "kolom — baris"', unnamed.length === 0 && fields.length > 150 && !!icd && !!icd.getAttribute('aria-labelledby') && !!ar.d.getElementById(icd.getAttribute('aria-labelledby')) && ar.d.querySelector('.igaseg button[data-v="2"]').getAttribute('aria-pressed') === 'true' && ar.d.querySelector('.igaseg button[data-v="1"]').getAttribute('aria-pressed') === 'false' && ar.d.querySelectorAll('.step .sec[role="heading"][aria-level="2"]').length >= 10 && ar.d.querySelector('.page[role="main"]') !== null && $(ar.d, 'hubchip').tagName === 'BUTTON' && /^Cream — /.test(rx0.getAttribute('aria-label') || '') && /^Diagnosis/.test(ar.w._ariaTeks(ar.d.getElementById($(ar.d, 'd2_dx').getAttribute('aria-labelledby')))) && !/wajib/.test(ar.w._ariaTeks(ar.d.getElementById($(ar.d, 'd2_dx').getAttribute('aria-labelledby')))), { n: fields.length, unnamed: unnamed.slice(0, 8).map(e => e.id || e.className || e.placeholder) });
      ar.w.tambahBarisRx && (() => { const t = ar.d.querySelector('#ac_block-2 .rx-table'); const b = t.parentElement.querySelector('.rxadd') || ar.d.querySelector('#ac_block-2 .rxadd'); if (b) { b.click(); const last = [...t.querySelectorAll('tbody tr:not(.rx-saran)')].pop(); const i = last.querySelector('input'); i.dispatchEvent(new ar.w.FocusEvent('focusin', { bubbles: true })); check('A11y nama: baris resep yang ditambah dinamai saat fokus', /— baris \d+$/.test(i.getAttribute('aria-label') || ''), i.getAttribute('aria-label')); } })(); }
    { const md = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      const dlgOk = p => { const m = md.d.querySelector('#ovl_' + p + ' .pmodal'); const lb = m && m.getAttribute('aria-labelledby'); return !!m && m.getAttribute('role') === 'dialog' && m.getAttribute('aria-modal') === 'true' && !!lb && !!md.d.getElementById(lb) && md.d.getElementById(lb).textContent.length > 5; };
      check('Modal program: role=dialog + aria-modal + aria-labelledby ke judul (acne, melasma, hair)', dlgOk('acne') && dlgOk('melasma') && dlgOk('hair'));
      md.w.goStep(2); $(md.d, 'pb_acne').focus(); md.w.openProg('acne'); await sleep(50);
      const inside = md.d.activeElement && $(md.d, 'ovl_acne').contains(md.d.activeElement);
      check('Modal program: fokus masuk ke tombol bagian aktif saat dibuka (aria-current=step)', inside && md.d.activeElement.classList.contains('on') && md.d.activeElement.getAttribute('aria-current') === 'step', md.d.activeElement && (md.d.activeElement.id || md.d.activeElement.className));
      const cards = [...md.d.querySelectorAll('.ovl .sev-card')];
      md.w.pickStage('acne', 2);
      check('Modal program: 7 kartu tahap = <button aria-pressed>; pilih tahap 2 -> pressed hanya di kartu 2; isi kartu tetap (tag/nama/desk)', cards.length === 7 && cards.every(c => c.tagName === 'BUTTON' && c.hasAttribute('aria-pressed')) && $(md.d, 'ac_sev-2').getAttribute('aria-pressed') === 'true' && $(md.d, 'ac_sev-1').getAttribute('aria-pressed') === 'false' && $(md.d, 'ac_sev-2').querySelector('.sev-tag').textContent === 'Tahap 2' && !!$(md.d, 'ac_sev-2').querySelector('.sev-desc'));
      md.d.querySelector('#ovl_acne .pmx').focus(); md.d.dispatchEvent(new md.w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
      check('Modal program: Shift+Tab dari × memutar ke elemen terakhir yang terlihat di modal (perangkap fokus)', md.d.activeElement && $(md.d, 'ovl_acne').contains(md.d.activeElement) && !md.d.activeElement.classList.contains('pmx'), md.d.activeElement && (md.d.activeElement.id || md.d.activeElement.className));
      md.w.closeProg('acne');
      check('Modal program: tutup -> fokus kembali ke kartu program #pb_acne', md.d.activeElement && md.d.activeElement.id === 'pb_acne', md.d.activeElement && md.d.activeElement.id); }
    { const idg = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      idg.w.issueHandoff(); await sleep(200);
      const items = [...idg.d.querySelectorAll('#tdlg_miss button, #tdlg_miss .plain')];
      check('Terbit tanpa identitas: peringatan PERTAMA "Identitas pasien belum lengkap" melompat ke #rm, baris Pasien ditandai warn', $(idg.d, 'tdlg').classList.contains('on') && items.length > 0 && /^Identitas pasien belum lengkap: nama & No\. RM kosong/.test(items[0].textContent) && items[0].getAttribute('data-go') === 'rm' && !!idg.d.querySelector('#tdlg_kv .v.warn') && /\(nama belum diisi\)/.test(idg.d.querySelector('#tdlg_kv .v.warn').textContent), items.map(b => b.textContent.slice(0, 60)));
      items[0].click(); await sleep(100);
      check('Terbit tanpa identitas: tombol peringatan menutup dialog dan memfokuskan #rm', !$(idg.d, 'tdlg').classList.contains('on') && !!idg.d.activeElement && idg.d.activeElement.id === 'rm', idg.d.activeElement && idg.d.activeElement.id);
      set(idg.d, 'p_nama', 'Uji Identitas'); set(idg.d, 'rm', 'RM-ID-1'); idg.w.issueHandoff(); await sleep(200);
      check('Terbit dengan identitas: peringatan identitas hilang, baris Pasien tidak warn', ![...idg.d.querySelectorAll('#tdlg_miss button, #tdlg_miss .plain')].some(b => /Identitas pasien/.test(b.textContent)) && !/Uji Identitas/.test((idg.d.querySelector('#tdlg_kv .v.warn') || {}).textContent || '')); $(idg.d, 'tdlg_x').click(); }
    { const lg2 = await open('ADC_Form2_Asesmen_Umum_Dokter.html', { user: null });
      const onL = id => !!$(lg2.d, id) && $(lg2.d, id).classList.contains('on');
      muatRM(lg2, 'muatIntakeHub', RM);
      await until(() => onL('ldlg'), 1500); $(lg2.d, 'ldlg_x').click(); await sleep(200);
      const m1 = $(lg2.d, 'mdlg_msg').textContent;
      check('Muat tanpa sesi: login dibatalkan -> pesan "Belum masuk ke hub" + tombol Masuk di dialog, RM tetap, bukan "tidak ada di hub"', onL('mdlg') && /Belum masuk ke hub/.test(m1) && !/tidak ada di hub/.test(m1) && !!$(lg2.d, 'mdlg_login') && !!lg2.d.querySelector('#mdlg_msg a[href="ADC_Panduan_Pengisian_Form.html"]') && $(lg2.d, 'mdlg_rm').value === RM, m1);
      $(lg2.d, 'mdlg_login').click(); await until(() => onL('ldlg'), 1500);
      $(lg2.d, 'ldlg_id').value = 'dokter'; $(lg2.d, 'ldlg_pin').value = PIN.dokter; $(lg2.d, 'ldlg_ok').click();
      await until(() => !!lg2.w._intake, 4000);
      check('Muat tanpa sesi: Masuk dari dialog -> RM dimuat otomatis, dialog tertutup, chip HUB bernama pengguna', !!lg2.w._intake && lg2.w._intake.pasien.rm === RM && !onL('mdlg') && !/belum masuk/i.test($(lg2.d, 'hubchip').textContent), $(lg2.d, 'hubchip').textContent); }
    { const dg = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
      const on = id => !!$(dg.d, id) && $(dg.d, id).classList.contains('on');
      dg.w.openICD(); const o1 = on('icdlg');
      dg.w.openRxPick(dg.d.querySelector('#ac_block-1 .rx-table tbody tr td input'));
      check('Dialog: membuka picker produk menutup picker ICD (tidak bertumpuk)', o1 && !on('icdlg') && on('rxpick'));
      dg.d.dispatchEvent(new dg.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('Dialog: Escape menutup picker produk', !on('rxpick'));
      dg.w.bukaConsent(); const c1 = on('cdlg'); dg.w.hubLogin();
      check('Dialog: membuka dialog Masuk menutup dialog consent; label tutup: picker "Tutup", form "Batal"', c1 && !on('cdlg') && on('ldlg') && $(dg.d, 'rxp_x').textContent === 'Tutup' && $(dg.d, 'cd_x').textContent === 'Batal' && $(dg.d, 'mdlg_x') === null);
      $(dg.d, 'ldlg_x').click();
      dg.w.bukaConsent(); const f = [...dg.d.querySelectorAll('#cdlg button, #cdlg input, #cdlg textarea')].filter(x => !x.disabled); f[f.length - 1].focus();
      dg.d.dispatchEvent(new dg.w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      check('Dialog: fokus terkunci — Tab dari elemen terakhir kembali ke elemen pertama', dg.d.activeElement === f[0], dg.d.activeElement && (dg.d.activeElement.id || dg.d.activeElement.tagName));
      dg.d.dispatchEvent(new dg.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('Dialog: Escape menutup dialog consent', !on('cdlg'));
      { $(dg.d, 'tb_more').focus(); dg.w.hubLogin(); dg.d.dispatchEvent(new dg.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        const f1 = dg.d.activeElement === $(dg.d, 'tb_more');
        $(dg.d, 'tb_more').focus(); dg.w.openICD(); dg.d.dispatchEvent(new dg.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        check('Dialog: fokus kembali ke pemicu setelah Escape pada dialog Masuk dan picker ICD-10', f1 && dg.d.activeElement === $(dg.d, 'tb_more'), { f1, now: dg.d.activeElement && dg.d.activeElement.id }); }
      dg.w.muatIntakeHub(); dg.w.hubLogin();
      check('Dialog: dialog Masuk di atas dialog Muat TIDAK menutupnya (alur 401 -> masuk -> ulangi)', on('mdlg') && on('ldlg'));
      $(dg.d, 'ldlg_x').click(); dg.d.dispatchEvent(new dg.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('Dialog: Escape menutup dialog Muat lewat tata dialog bersama', !on('mdlg')); }

    /* ===== 5h. jejak audit, koreksi 2x24 jam, TTD palsu, login dari form ===== */
    { const au = (await (await fetch(BASE + '/api/audit?n=500', { headers: Hd('admin') })).json()).audit;
      const aksi = au.map(x => x.aksi);
      check('hub: jejak audit mencatat login, intake (perawat), lihat, handoff (dokter), consent, tolak', ['login', 'intake', 'intake_koreksi', 'lihat', 'handoff', 'consent', 'tolak', 'backup'].every(k => aksi.includes(k)) &&
        au.some(x => x.aksi === 'intake' && x.user === 'perawat' && x.rm === RM) && au.some(x => x.aksi === 'handoff' && x.user === 'dokter' && /ttd dokter/.test(x.detail)) && au.every(x => x.t && (x.ip !== undefined || /backup/.test(x.aksi))), [...new Set(aksi)]);
      const auRM = (await (await fetch(BASE + '/api/audit?rm=' + RM, { headers: Hd('admin') })).json()).audit;
      check('hub: audit bisa difilter per RM', auRM.length > 0 && auRM.every(x => x.rm === RM));
      /* koreksi >2x24 jam: perawat ditolak, admin boleh */
      const ikNow = disk('intake.json'); ikNow._audit.waktu = new Date(Date.now() - 3 * 86400000).toISOString();
      fs.writeFileSync(path.join('data', RM, 'intake.json'), enkrip(ikNow));
      const body = JSON.stringify(Object.assign({}, ikNow, { _audit: undefined }));
      const r1 = await fetch(BASE + '/api/intake', { method: 'POST', headers: Hd('perawat', true), body }); const j1 = await r1.json();
      const r2 = await fetch(BASE + '/api/intake', { method: 'POST', headers: Hd('admin', true), body });
      const ikA = disk('intake.json');
      check('hub: koreksi Form 1 >2x24 jam ditolak untuk perawat (403, pesan jelas) & diterima admin; versi lama diarsipkan', r1.status === 403 && /2x24 jam/.test(j1.error) && r2.status === 200 && ikA._audit.oleh === 'admin' && ikA._audit.koreksi_dari && ikA._audit.koreksi_dari.oleh === 'perawat', { r1: r1.status, j1, r2: r2.status });
      /* TTD: hanya dokter, PIN benar; stempel palsu ditandai */
      check('hub: /api/ttd menolak PIN salah (401) dan peran perawat (403)', (await fetch(BASE + '/api/ttd', { method: 'POST', headers: Hd('perawat', true), body: JSON.stringify({ id: 'dokter', pin: '999999' }) })).status === 401 &&
        (await fetch(BASE + '/api/ttd', { method: 'POST', headers: Hd('perawat', true), body: JSON.stringify({ id: 'perawat', pin: PIN.perawat }) })).status === 403);
      const tt = await (await fetch(BASE + '/api/ttd', { method: 'POST', headers: Hd('perawat', true), body: JSON.stringify({ id: 'dokter', pin: PIN.dokter, rm: 'RM-FORGE' }) })).json();
      check('hub: perawat yang masuk bisa meminta TTD atas PIN dokter (dokter tanda tangan di tablet perawat)', tt.ok && tt.ttd.id === 'dokter' && tt.ttd.sig);
      const palsu = Object.assign({}, tt.ttd, { nama: 'dr. Palsu' });
      await fetch(BASE + '/api/handoff', { method: 'POST', headers: Hd('perawat', true), body: JSON.stringify({ doc: 'ADC-HANDOFF', pasien: { rm: 'RM-FORGE', nama: 'Forge' }, asesmen: {}, penerbitan: { signoff_dokter: true, ttd: palsu } }) });
      const hf = disk('handoff_terakhir.json', 'RM-FORGE');
      check('hub: stempel TTD yang diubah ditandai ttd_valid=false & tercatat di audit', hf && hf._audit.ttd_valid === false && (await (await fetch(BASE + '/api/audit?rm=RM-FORGE', { headers: Hd('admin') })).json()).audit.some(x => /TTD-TIDAK-VALID/.test(x.detail || '')), hf && hf._audit); }
    { const lg = await open('ADC_Form2_Asesmen_Umum_Dokter.html', { user: null });
      check('F2 tanpa sesi: chip kuning "belum masuk" (12 px)', $(lg.d, 'hubchip').classList.contains('warn') && /belum masuk/i.test($(lg.d, 'hubchip').textContent), $(lg.d, 'hubchip').textContent);
      muatRM(lg, 'muatIntakeHub', RM);
      const dl = await until(() => $(lg.d, 'ldlg') && $(lg.d, 'ldlg').classList.contains('on'), 2000);
      check('F2 tanpa sesi: Muat Form 1 memunculkan dialog Masuk', dl === true);
      $(lg.d, 'ldlg_id').value = 'dokter'; $(lg.d, 'ldlg_pin').value = '000000'; $(lg.d, 'ldlg_ok').click();
      await until(() => /salah/i.test($(lg.d, 'ldlg_msg').textContent), 2000);
      check('F2 login: PIN salah -> pesan di dialog, tetap terbuka', /ID atau PIN salah/.test($(lg.d, 'ldlg_msg').textContent) && $(lg.d, 'ldlg').classList.contains('on'), $(lg.d, 'ldlg_msg').textContent);
      $(lg.d, 'ldlg_pin').value = PIN.dokter; $(lg.d, 'ldlg_ok').click();
      await until(() => lg.w._intake, 3000);
      check('F2 login: PIN benar -> masuk, permintaan diulang otomatis, Form 1 termuat, chip = nama dokter', lg.w._intake && lg.w._intake.pasien.rm === RM && lg.w._hubUser && lg.w._hubUser.id === 'dokter' && /dr\. Uji/.test($(lg.d, 'hubchip').textContent) && lg.w.localStorage.getItem('adc_hub_tok'), { u: lg.w._hubUser, chip: $(lg.d, 'hubchip').textContent });
      lg.w.hubLogin(); $(lg.d, 'ldlg_out').click(); await sleep(200);
      check('F2: Keluar menghapus token & chip kembali "klik untuk masuk"', !lg.w.localStorage.getItem('adc_hub_tok') && !lg.w._hubUser && $(lg.d, 'hubchip').classList.contains('warn'), $(lg.d, 'hubchip').textContent); }

    /* ===== 6. offline-first: kunci salah / hub mati ===== */
    const bad = await open('ADC_Form2_Asesmen_Umum_Dokter.html', { key: 'salah' });
    muatRM(bad, 'muatIntakeHub', RM); await sleep(500);
    check('F2 kunci salah: tidak crash, dialog tetap terbuka, pesan "belum terdaftar di hub" + tombol Atur hub (bukan "tidak ada di hub" / config.json)', bad.d.getElementById('mdlg').classList.contains('on') && /belum terdaftar di hub/.test(bad.d.getElementById('mdlg_msg').textContent) && !/tidak ada di hub|config\.json/.test(bad.d.getElementById('mdlg_msg').textContent) && !!bad.d.getElementById('mdlg_kunci'), bad.d.getElementById('mdlg_msg').textContent);
    set(bad.d, 'rm', RM); set(bad.d, 'd2_dx', 'x'); chk(bad.d, 'alergi_none');
    await sleep(700);
    check('Chip HUB saat load dengan kunci salah: "belum terdaftar" (bukan "belum masuk")', /belum terdaftar/.test($(bad.d, 'hubchip').textContent), $(bad.d, 'hubchip').textContent);
    bad.w.issueHandoff(); await until(() => /belum terdaftar/.test(($(bad.d, 'tdlg_hub') || {}).textContent || ''), 2000);
    check('Dialog Terbitkan dengan kunci salah: baris Hub "tablet belum terdaftar — hanya akan diunduh" (warn) + tombol Daftarkan tablet; tombol terbit "tanpa hub"', /belum terdaftar/.test($(bad.d, 'tdlg_hub').textContent) && $(bad.d, 'tdlg_hub').classList.contains('warn') && !!bad.d.querySelector('#tdlg_miss button[data-hub="kunci"]') && /tanpa hub/.test($(bad.d, 'tdlg_ok').textContent), { hub: $(bad.d, 'tdlg_hub').textContent, ok: $(bad.d, 'tdlg_ok').textContent });
    $(bad.d, 'tdlg_x').click();
    const sgBad = await signoff(bad, { batal: true }); await sleep(300);
    check('Sign-off dengan kunci salah: tanpa dialog PIN, centang tetap, status "dicatat tanpa tanda tangan PIN" + Daftarkan tablet, butir WAJIB sign-off terpenuhi', sgBad === false && $(bad.d, 'd8_signoff').checked && /tanpa tanda tangan PIN/.test($(bad.d, 'd8_ttd').textContent) && $(bad.d, 'd8_ttd').classList.contains('warn') && !!bad.d.querySelector('#d8_ttd button') && bad.w.reqStatus().some(x => x.label === 'Sign-off dokter' && x.ok), $(bad.d, 'd8_ttd').textContent);
    check('Sign-off tanpa PIN (kunci salah): baris "Sekarang" langkah 6 tidak lagi menunggu tanda tangan; kosakata tombol perawat', !/Tunggu dokter/.test(bad.w._serahSekarang(bad.w._serahData())[0]) && /Buat jadwal kontrol|ritme kontrol/.test(bad.w._serahSekarang(bad.w._serahData())[0]), bad.w._serahSekarang(bad.w._serahData())[0]);
    bad.dialogs.length = 0; await terbit(bad, { batal: true });
    check('Terbitkan dengan kunci salah: PIN tidak diminta lagi; handoff mencatat ttd_tidak_bisa', !($(bad.d, 'ldlg') && $(bad.d, 'ldlg').classList.contains('on')) && bad.w.buildHandoff().penerbitan.ttd_tidak_bisa === 'kunci');
    await until(() => /✗ TIDAK tersimpan di hub/.test($(bad.d, 'd8_status').value), 3000);
    check('F2 kunci salah: Terbitkan TANPA alert — kartu selesai menyebut "belum terdaftar di hub" + status ✗', !bad.dialogs.some(x => x.type === 'alert' && /PERHATIAN/.test(x.msg)) && /belum terdaftar di hub/.test($(bad.d, 'terbit_done_hub').textContent) && !/config\.json/.test($(bad.d, 'terbit_done_hub').textContent) && /✗ TIDAK tersimpan di hub/.test($(bad.d, 'd8_status').value), $(bad.d, 'd8_status').value);
    const before = fs.readdirSync(path.join('data', RM)).length;
    const f1b = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html', { key: 'salah' });
    set(f1b.d, 'p_nama', 'Offline'); set(f1b.d, 'rm', 'RM-TEST-OFF'); chk(f1b.d, 'p_foto_ok'); f1b.w.simpanIntake(); await sleep(500);
    check('F1: foto diambil tanpa izin lisan -> peringatan', f1b.dialogs.some(x => x.type === 'confirm' && /persetujuan lisan/.test(x.msg)));
    await until(() => f1b.dialogs.some(x => x.type === 'alert' && /GAGAL/.test(x.msg)), 3000);
    check('F1 kunci salah: pesan ✗ GAGAL menyimpan ke hub (bukan "tersimpan")', f1b.dialogs.some(x => x.type === 'alert' && /✗ GAGAL menyimpan ke hub/.test(x.msg) && /belum terdaftar di hub/.test(x.msg) && !/config\.json/.test(x.msg)) && !f1b.dialogs.some(x => x.type === 'alert' && /✓/.test(x.msg)));
    check('F1 kunci salah: berkas unduhan tetap dibuat; hub menolak (tak ada data baru)', f1b.dialogs.some(x => x.type === 'download') && !fs.existsSync(path.join('data', 'RM-TEST-OFF')) && fs.readdirSync(path.join('data', RM)).length === before);
    srv.kill(); await sleep(400);
    const off = await open('ADC_Form2_Asesmen_Umum_Dokter.html');
    check('F2 hub mati: halaman tetap termuat', !!off.w.issueHandoff && off.w._hubOn === false);
    set(off.d, 'p_nama', 'Offline'); set(off.d, 'rm', 'RM-OFF'); set(off.d, 'd2_dx', 'x'); chk(off.d, 'd8_signoff'); chk(off.d, 'alergi_none');
    check('F2 hub mati: sign-off menampilkan "Hub mati — tanpa tanda tangan elektronik" tanpa dialog', /Hub mati/.test($(off.d, 'd8_ttd').textContent) && !$(off.d, 'ldlg'), $(off.d, 'd8_ttd').textContent);
    chk(off.d, 'd8_consent');
    let threw = null; try { off.w.issueHandoff(); } catch (e) { threw = e; }
    const offDlg = $(off.d, 'tdlg') && $(off.d, 'tdlg').classList.contains('on');
    const offHub = (off.d.querySelector('#tdlg_kv') || {}).textContent || '';
    if (offDlg) $(off.d, 'tdlg_ok').click();
    check('F2 hub mati: dialog Terbitkan tetap muncul (tanpa PIN), menyebut HUB MATI; terbitkan handoff tetap jalan (popup/JSON cadangan)', !threw && offDlg && /MATI/.test(offHub) && !$(off.d, 'ldlg') && off.w.__popup && /Ringkasan Handoff/.test(off.w.__popup.document.html), threw ? String(threw) : { offDlg, offHub: offHub.slice(0, 120) });
    check('F2 hub mati: kartu selesai memperingatkan HUB MATI (unduh JSON)', !$(off.d, 'terbit_done').hidden && /HUB MATI/.test($(off.d, 'terbit_done_hub').textContent) && $(off.d, 'terbit_done_hub').classList.contains('warn'));
    let klik = 0; off.w.HTMLInputElement.prototype.click = function () { if (this.id === '_handofffile') klik++; };
    check('F2 hub mati: status D7 menyebut HUB MATI', /HUB MATI/.test($(off.d, 'd8_status').value), $(off.d, 'd8_status').value);
    { const f1o = await open('ADC_Form1_Registrasi_Anamnesis_Pasien.html');
      set(f1o.d, 'p_nama', 'Offline'); set(f1o.d, 'rm', 'RM-OFF'); f1o.w.simpanIntake();
      check('F1 hub mati: pesan "TIDAK tersambung — hanya berkas"', f1o.dialogs.some(x => x.type === 'alert' && /TIDAK tersambung/.test(x.msg)) && f1o.dialogs.some(x => x.type === 'download')); }
    off.w.muatHandoffHub();
    check('F2 hub mati: "Muat Handoff" jatuh ke pemilih berkas', klik === 1, klik);
  } catch (e) { console.log('ERROR TEST:', e.stack); results.push({ name: 'harness', ok: false, detail: String(e) }); }
  finally { try { srv.kill(); } catch (e) {} }
  const gagal = results.filter(r => !r.ok);
  console.log('\n' + (results.length - gagal.length) + '/' + results.length + ' lulus');
  try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) {}
  process.exit(gagal.length ? 1 : 0);
})();
