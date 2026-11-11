/* ============================================================================
   ADC HUB — companion server untuk Skin Quality Program (Tahap 1 + kepatuhan)
   ----------------------------------------------------------------------------
   Tujuan: intake & handoff tidak lagi berpindah lewat unduh/unggah berkas
   secara manual — form menyimpan dan memuat lewat jaringan klinik, dengan
   No. RM sebagai kunci. Unduhan berkas di form TETAP jalan sebagai cadangan.

   Sengaja TANPA dependensi (Node stdlib murni):
   - tidak ada `npm install` yang bisa gagal di PC klinik,
   - penyimpanan = folder per pasien berisi JSON, bisa di-backup dengan
     menyalin folder `data/` (isinya terenkripsi — butuh config.json untuk dibaca),
   - satu berkas ini + Node LTS = seluruh instalasi.

   Kepatuhan (PMK 24/2022, PP 28/2024, KMK 1983/2022 PKP 12, UU PDP):
   - PENGGUNA & HAK AKSES  : users.json (PIN di-hash scrypt), peran admin/dokter/perawat/cs,
                             sesi 12 jam idle (Pasal 30: hak input/perbaikan/lihat per orang).
   - JEJAK AUDIT          : data/_audit.log — siapa, kapan, dari IP mana, aksi apa, RM mana.
   - TANDA TANGAN         : POST /api/ttd — dokter mengonfirmasi sign-off dengan PIN-nya;
                             hub menerbitkan stempel ber-HMAC yang ikut tersimpan di handoff
                             (nama + waktu + bukti autentikasi; Pasal 16 ayat 2, Pasal 31).
   - KOREKSI 2x24 JAM     : intake hanya boleh ditimpa dalam 48 jam oleh perawat/dokter;
                             lewat itu perlu admin (pimpinan) — Pasal 30 ayat 6–7.
   - ENKRIPSI DI DISK     : semua JSON di data/ = amplop AES-256-GCM dengan data_key
                             di config.json (Pasal 29: kerahasiaan & integritas).
   - CADANGAN             : backup_dir di lokasi lain, berkala (Pasal 20 ayat 4–5).
   - HTTPS                : bila hub.pfx ada (tools/buat-sertifikat.ps1), jalan di https.

   Jalankan:  node server.js            (atau klik dua kali start.bat)
              node server.js --backup   (cadangan sekali jalan, lalu keluar)
   Uji:       http://localhost:3777/api/ping
   Pengguna:  node tools/pengguna.js daftar | tambah <id> "<nama>" <peran> <pin> | pin <id> <pin> | nonaktif <id>
   ============================================================================ */
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const CFGP = path.join(ROOT, 'config.json');
const USERSP = path.join(ROOT, 'users.json');
const SESIP = path.join(DATA, '_sesi.json');
const AUDITP = path.join(DATA, '_audit.log');
const SESI_IDLE_MS = 12 * 3600 * 1000;
const KOREKSI_MS = 2 * 24 * 3600 * 1000;

/* ---- konfigurasi (dibuat/dilengkapi otomatis) ---- */
let CFG = { port: 3777, key: '', webhook: '', data_key: '', backup_dir: '', backup_jam: 6, backup_simpan: 14, tls: { pfx: 'hub.pfx', passphrase: '' } };
try { CFG = Object.assign(CFG, JSON.parse(fs.readFileSync(CFGP, 'utf8'))); } catch (e) { /* belum ada */ }
let cfgBaru = false;
if (!CFG.key) { CFG.key = 'adc-' + crypto.randomBytes(4).toString('hex'); cfgBaru = true; }
if (!CFG.data_key) { CFG.data_key = crypto.randomBytes(32).toString('hex'); cfgBaru = true; }
if (cfgBaru) fs.writeFileSync(CFGP, JSON.stringify(CFG, null, 2));
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

/* ---- NeoSoft Cube — pembacaan identitas pasien by RM (BACA-SAJA, opsional) ----
   neosoft.json (gitignored, hanya di PC klinik):
     { host, port, user, password, database,
       identitas: { sql: "SELECT no_rm AS rm, nama, nik, tgl_lahir, jk AS kelamin, hp AS wa, alamat, kota FROM pasien WHERE no_rm = ? LIMIT 1",
                    kolom: { rm:"no_rm", nama:"nama_pasien" }   // opsional: peta bila alias di SQL tidak dipakai
                  },
       mock: { "RM-001": { nama:"…", nik:"…" } }               // opsional: uji tanpa database
     }
   Hanya SATU pernyataan SELECT yang dijalankan; sesi dipaksa READ ONLY; modul mysql2 dimuat saat dibutuhkan. */
const NEOP = path.join(ROOT, 'neosoft.json');
let NEO = null; try { NEO = JSON.parse(fs.readFileSync(NEOP, 'utf8')); } catch (e) { NEO = null; }
const NEO_KOLOM = ['rm', 'nama', 'nik', 'tgl_lahir', 'kelamin', 'wa', 'alamat', 'kota', 'email'];
const neoAktif = () => !!(NEO && (NEO.mock || (NEO.host && NEO.identitas && NEO.identitas.sql)));
let _neoPool = null; const _neoCache = {};
function neoNormal(row, peta) {
  if (!row) return null; const out = {}; peta = peta || {};
  const lc = {}; Object.keys(row).forEach(k => { lc[k.toLowerCase()] = row[k]; });
  NEO_KOLOM.forEach(k => { const src = peta[k] ? String(peta[k]).toLowerCase() : k; let v = lc[src]; if (v === undefined || v === null) v = ''; if (v instanceof Date) v = v.toISOString().slice(0, 10); out[k] = String(v).trim(); });
  if (/^(l|laki|laki-laki|male|m|pria)$/i.test(out.kelamin)) out.kelamin = 'Laki-laki'; else if (/^(p|perempuan|female|f|wanita)$/i.test(out.kelamin)) out.kelamin = 'Perempuan';
  return out;
}
async function neoIdentitas(rm) {
  if (!NEO) return null;
  if (NEO.mock) { const m = NEO.mock[rm] || NEO.mock[String(rm).toUpperCase()]; return m ? neoNormal(Object.assign({ rm }, m)) : null; }
  const sql = String((NEO.identitas || {}).sql || '').trim();
  if (!/^select\s/i.test(sql) || /;\s*\S/.test(sql) || !sql.includes('?')) throw new Error('neosoft.json: identitas.sql harus satu pernyataan SELECT dengan satu tanda ?');
  let mysql; try { mysql = require('mysql2/promise'); } catch (e) { throw new Error('modul mysql2 belum terpasang — jalankan: npm install mysql2 (di folder adc-hub)'); }
  if (!_neoPool) _neoPool = mysql.createPool({ host: NEO.host, port: NEO.port || 3306, user: NEO.user, password: NEO.password, database: NEO.database || undefined, connectionLimit: 2, connectTimeout: 5000, waitForConnections: true });
  const conn = await _neoPool.getConnection();
  try {
    try { await conn.query('SET SESSION TRANSACTION READ ONLY'); } catch (e) { /* versi lama tanpa dukungan: tetap SELECT saja */ }
    const [rows] = await conn.query(sql, [rm]);
    return rows && rows[0] ? neoNormal(rows[0], (NEO.identitas || {}).kolom) : null;
  } finally { conn.release(); }
}
const DATA_KEY = Buffer.from(CFG.data_key, 'hex');
const HMAC_KEY = crypto.createHash('sha256').update('ttd:' + CFG.data_key).digest();

/* ---- util ---- */
function aman(rm) { // RM -> nama folder yang aman
  const s = String(rm || '').trim().replace(/[^A-Za-z0-9_.-]/g, '_');
  if (!s || s === '.' || s === '..' || s.startsWith('_')) return null;
  return s.slice(0, 64);
}
function dirRM(rm) { return path.join(DATA, aman(rm)); }
function stampe() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function ipDari(req) { return (req.socket && req.socket.remoteAddress) || ''; }

/* ---- enkripsi di disk: amplop AES-256-GCM; berkas lama (plaintext) tetap terbaca ---- */
function enkrip(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', DATA_KEY, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return JSON.stringify({ enc: 'aes-256-gcm', iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), ct: ct.toString('base64') });
}
function dekrip(txt) {
  const env = JSON.parse(txt);
  if (!env || env.enc !== 'aes-256-gcm') return env;               // plaintext lama
  const d = crypto.createDecipheriv('aes-256-gcm', DATA_KEY, Buffer.from(env.iv, 'base64'));
  d.setAuthTag(Buffer.from(env.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(env.ct, 'base64')), d.final()]).toString('utf8'));
}
function bacaJSON(p) { try { return dekrip(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }
function tulisJSON(p, obj) { fs.writeFileSync(p, enkrip(obj)); }

/* ---- jejak audit (append-only, tiap baris terenkripsi) ---- */
function audit(rec) {
  try { fs.appendFileSync(AUDITP, enkrip(Object.assign({ t: new Date().toISOString() }, rec)) + '\n'); } catch (e) { console.error('audit gagal', e.message); }
}
function bacaAudit(filter, maks) {
  if (!fs.existsSync(AUDITP)) return [];
  const out = [];
  for (const line of fs.readFileSync(AUDITP, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const r = dekrip(line); if (!filter || filter(r)) out.push(r); } catch (e) { /* baris rusak */ }
  }
  return out.slice(-(maks || 200));
}

/* ---- pengguna (users.json; PIN di-hash scrypt) ---- */
function bacaUsers() { try { return JSON.parse(fs.readFileSync(USERSP, 'utf8')); } catch (e) { return { users: [] }; } }
function tulisUsers(u) { fs.writeFileSync(USERSP, JSON.stringify(u, null, 2)); }
function hashPin(pin, salt) { return crypto.scryptSync(String(pin), salt, 32).toString('hex'); }
function buatUser(u, id, nama, peran, pin) {
  const salt = crypto.randomBytes(8).toString('hex');
  const rec = { id: String(id).trim().toLowerCase(), nama, peran, salt, hash: hashPin(pin, salt), aktif: true, dibuat: new Date().toISOString() };
  u.users = (u.users || []).filter(x => x.id !== rec.id).concat([rec]);
  return rec;
}
function cekPin(user, pin) {
  if (!user || !user.aktif) return false;
  const a = Buffer.from(hashPin(pin, user.salt), 'hex'), b = Buffer.from(user.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const PERAN = ['admin', 'dokter', 'perawat', 'cs'];
/* hak akses per peran (Pasal 30 ayat 3: input, perbaikan, lihat) */
const HAK = {
  lihat: ['admin', 'dokter', 'perawat', 'cs'],
  intake: ['admin', 'dokter', 'perawat'],
  handoff: ['admin', 'dokter', 'perawat'],
  consent: ['admin', 'dokter', 'perawat'],
  koreksi_lama: ['admin'],
  audit: ['admin'],
  users: ['admin']
};
{ /* pengguna pertama: admin dengan PIN acak, tampil sekali di konsol */
  const u = bacaUsers();
  if (!u.users || !u.users.length) {
    const pin = String(100000 + crypto.randomInt(900000));
    buatUser(u, 'admin', 'Pimpinan klinik', 'admin', pin); tulisUsers(u);
    console.log('\n*** PENGGUNA PERTAMA dibuat: id "admin", PIN ' + pin + ' — catat & segera ganti (tools/pengguna.js pin admin <pinbaru>) ***\n');
  }
}

/* ---- sesi (token di memori + disk agar restart tidak mengeluarkan semua orang) ---- */
let SESI = bacaJSON(SESIP) || {};
function simpanSesi() { try { tulisJSON(SESIP, SESI); } catch (e) {} }
function sesiDari(req) {
  const tok = req.headers['x-adc-token'] || '';
  const s = tok && SESI[tok];
  if (!s) return null;
  if (Date.now() - new Date(s.terakhir).getTime() > SESI_IDLE_MS) { delete SESI[tok]; simpanSesi(); return null; }
  s.terakhir = new Date().toISOString();
  return s;
}
function buatSesi(user, ip) {
  const tok = crypto.randomBytes(24).toString('hex');
  SESI[tok] = { id: user.id, nama: user.nama, peran: user.peran, mulai: new Date().toISOString(), terakhir: new Date().toISOString(), ip };
  simpanSesi();
  return tok;
}
setInterval(() => { // bersihkan sesi kedaluwarsa
  let ubah = false;
  for (const t of Object.keys(SESI)) if (Date.now() - new Date(SESI[t].terakhir).getTime() > SESI_IDLE_MS) { delete SESI[t]; ubah = true; }
  if (ubah) simpanSesi();
}, 600000).unref();

/* ---- tanda tangan dokter: stempel ber-HMAC (id|nama|waktu|nonce) ---- */
function buatTTD(user) {
  const t = { id: user.id, nama: user.nama, peran: user.peran, waktu: new Date().toISOString(), nonce: crypto.randomBytes(6).toString('hex') };
  t.sig = crypto.createHmac('sha256', HMAC_KEY).update([t.id, t.nama, t.waktu, t.nonce].join('|')).digest('hex');
  return t;
}
function cekTTD(t) {
  if (!t || !t.sig) return false;
  const s = crypto.createHmac('sha256', HMAC_KEY).update([t.id, t.nama, t.waktu, t.nonce].join('|')).digest('hex');
  return s.length === String(t.sig).length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(String(t.sig)));
}

/* ---- cadangan ke lokasi lain (Pasal 20 ayat 4–5) ---- */
function backup(alasan) {
  if (!CFG.backup_dir) return { ok: false, error: 'backup_dir belum diisi di config.json' };
  try {
    const tujuan = path.join(CFG.backup_dir, 'adc-data-' + stampe().slice(0, 16));
    fs.mkdirSync(CFG.backup_dir, { recursive: true });
    fs.cpSync(DATA, tujuan, { recursive: true });
    fs.writeFileSync(path.join(CFG.backup_dir, 'BACA-SAYA.txt'),
      'Cadangan ADC Hub. Berkas di dalamnya TERENKRIPSI — hanya bisa dibaca dengan data_key di config.json hub.\n' +
      'Simpan salinan config.json di tempat terpisah & aman (bukan di folder ini). Pulihkan: salin folder adc-data-... ke adc-hub/data.\n');
    /* simpan hanya N cadangan terakhir */
    const semua = fs.readdirSync(CFG.backup_dir).filter(f => /^adc-data-/.test(f)).sort();
    for (const f of semua.slice(0, Math.max(0, semua.length - (CFG.backup_simpan || 14)))) fs.rmSync(path.join(CFG.backup_dir, f), { recursive: true, force: true });
    audit({ aksi: 'backup', detail: tujuan + (alasan ? ' (' + alasan + ')' : '') });
    return { ok: true, tujuan };
  } catch (e) { audit({ aksi: 'backup_gagal', detail: e.message }); return { ok: false, error: e.message }; }
}
if (process.argv.includes('--backup')) { const r = backup('manual'); console.log(r.ok ? 'Cadangan: ' + r.tujuan : 'GAGAL: ' + r.error); process.exit(r.ok ? 0 : 1); }

/* ---- penyajian form (www/) ---- */
const WWW = path.join(ROOT, 'www');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
               '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
function sajikan(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = path.normalize(path.join(WWW, rel));
  if (!abs.startsWith(WWW + path.sep) && abs !== WWW) { res.writeHead(403); return res.end('dilarang'); }
  const ext = path.extname(abs).toLowerCase();
  if (!MIME[ext] || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) { res.writeHead(404); return res.end('tidak ada'); }
  res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache' });
  fs.createReadStream(abs).pipe(res);
}
function kirim(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-ADC-Key, X-ADC-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Private-Network': 'true'
  });
  res.end(JSON.stringify(obj));
}
function bodyJSON(req, cb) {
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 8e6) req.destroy(); });
  req.on('end', () => { let o; try { o = JSON.parse(raw); } catch (e) { return cb(null); } cb(o); });
}
function rmDari(o) { return o && ((o.pasien && o.pasien.rm) || o.rm) || null; }
function daftarConsent(dir) {
  return fs.readdirSync(dir).filter(f => /^consent_/.test(f)).sort().map(f => {
    const c = bacaJSON(path.join(dir, f)) || {};
    return { no: c.no || f, tanggal: c.tanggal || '', tindakan: (c.tindakan || []).map(t => t.nama || t).join(', '), dokter: c.dokter || '' };
  });
}

const handler = (req, res) => {
  const t0 = Date.now();
  res.on('finish', () => console.log(new Date().toISOString().slice(11, 19), req.method, req.url, res.statusCode, (Date.now() - t0) + 'ms'));
  if (req.method === 'OPTIONS') return kirim(res, 204, {});
  const u = new URL(req.url, 'http://x');
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') return sajikan(req, res, u.pathname);
  const ip = ipDari(req);

  /* ping tidak butuh kunci — dipakai form untuk deteksi hub */
  if (parts[1] === 'ping') return kirim(res, 200, { ok: true, app: 'adc-hub', versi: 2, webhook: CFG.webhook || '', login: true, neosoft: neoAktif() });

  /* lapis 1: kunci perangkat */
  if ((req.headers['x-adc-key'] || '') !== CFG.key) return kirim(res, 401, { error: 'kunci salah. Lihat config.json di folder adc-hub.' });

  /* lapis 2: pengguna */
  if (req.method === 'POST' && parts[1] === 'login') {
    return bodyJSON(req, o => {
      const users = bacaUsers().users || [];
      const user = o && users.find(x => x.id === String(o.id || '').trim().toLowerCase());
      if (!cekPin(user, o && o.pin)) { audit({ aksi: 'login_gagal', ip, user: o && o.id }); return kirim(res, 401, { error: 'ID atau PIN salah' }); }
      const tok = buatSesi(user, ip);
      audit({ aksi: 'login', ip, user: user.id, peran: user.peran });
      return kirim(res, 200, { ok: true, token: tok, user: { id: user.id, nama: user.nama, peran: user.peran } });
    });
  }
  const sesi = sesiDari(req);
  if (!sesi) return kirim(res, 401, { error: 'login', pesan: 'Masuk dulu dengan ID & PIN pengguna.' });
  const boleh = (aksi) => (HAK[aksi] || []).includes(sesi.peran);
  const tolak = (aksi) => { audit({ aksi: 'tolak', ip, user: sesi.id, peran: sesi.peran, detail: aksi }); return kirim(res, 403, { error: 'peran ' + sesi.peran + ' tidak berhak: ' + aksi }); };

  if (parts[1] === 'saya') return kirim(res, 200, { ok: true, user: { id: sesi.id, nama: sesi.nama, peran: sesi.peran } });
  if (req.method === 'POST' && parts[1] === 'logout') { delete SESI[req.headers['x-adc-token']]; simpanSesi(); audit({ aksi: 'logout', ip, user: sesi.id }); return kirim(res, 200, { ok: true }); }

  /* identitas pasien dari NeoSoft by RM (baca-saja; semua peran yang boleh "lihat") */
  if (req.method === 'GET' && parts[1] === 'neosoft' && parts[2]) {
    if (!boleh('lihat')) return tolak('lihat');
    if (!neoAktif()) return kirim(res, 404, { error: 'NeoSoft belum dikonfigurasi di hub (neosoft.json)' });
    const rm = decodeURIComponent(parts[2]).trim(); if (!rm) return kirim(res, 400, { error: 'RM kosong' });
    const jawab = (d) => kirim(res, d ? 200 : 404, d ? { ok: true, sumber: 'neosoft', pasien: d } : { error: 'RM ' + rm + ' tidak ada di NeoSoft' });
    const c = _neoCache[rm]; if (c && Date.now() - c.t < 60000) return jawab(c.d);
    return neoIdentitas(rm).then(d => { _neoCache[rm] = { t: Date.now(), d }; audit({ aksi: 'neosoft', ip, user: sesi.id, rm, detail: d ? 'ada' : 'tidak ada' }); return jawab(d); })
      .catch(e => { console.error('NeoSoft:', e.message); audit({ aksi: 'neosoft', ip, user: sesi.id, rm, detail: 'gagal: ' + e.message.slice(0, 80) }); return kirim(res, 502, { error: 'NeoSoft tidak terjangkau: ' + e.message }); });
  }

  /* tanda tangan dokter: konfirmasi PIN -> stempel */
  if (req.method === 'POST' && parts[1] === 'ttd') {
    return bodyJSON(req, o => {
      const users = bacaUsers().users || [];
      const user = o && users.find(x => x.id === String(o.id || sesi.id).trim().toLowerCase());
      if (!user || user.peran !== 'dokter' && user.peran !== 'admin') return kirim(res, 403, { error: 'tanda tangan hanya untuk pengguna berperan dokter' });
      if (!cekPin(user, o && o.pin)) { audit({ aksi: 'ttd_gagal', ip, user: user.id }); return kirim(res, 401, { error: 'PIN dokter salah' }); }
      const t = buatTTD(user);
      audit({ aksi: 'ttd', ip, user: user.id, rm: o && o.rm, detail: 'oleh sesi ' + sesi.id });
      return kirim(res, 200, { ok: true, ttd: t });
    });
  }

  /* GET /api/pasien -> daftar ringkas */
  if (req.method === 'GET' && parts[1] === 'pasien' && !parts[2]) {
    if (!boleh('lihat')) return tolak('lihat');
    const out = [];
    for (const d of fs.readdirSync(DATA)) {
      if (d.startsWith('_') || !fs.statSync(path.join(DATA, d)).isDirectory()) continue;
      const ik = bacaJSON(path.join(DATA, d, 'intake.json'));
      const ho = bacaJSON(path.join(DATA, d, 'handoff_terakhir.json'));
      out.push({
        rm: d,
        nama: (ik && ik.pasien && ik.pasien.nama) || (ho && ho.pasien && ho.pasien.nama) || '',
        kunjungan_ke: (ho && ho.kunjungan_ke) || (ik ? 0 : null),
        program: (ho && ho.asesmen && ho.asesmen.program) || '',
        diperbarui: (ho && ho.diterbitkan) || (ik && ik.diterbitkan) || ''
      });
    }
    out.sort((a, b) => String(b.diperbarui).localeCompare(String(a.diperbarui)));
    audit({ aksi: 'daftar', ip, user: sesi.id });
    return kirim(res, 200, { pasien: out });
  }

  /* GET /api/pasien/:rm -> paket lengkap utk form */
  if (req.method === 'GET' && parts[1] === 'pasien' && parts[2]) {
    if (!boleh('lihat')) return tolak('lihat');
    const rm = aman(decodeURIComponent(parts[2]));
    if (!rm) return kirim(res, 400, { error: 'RM tidak valid' });
    const dir = dirRM(rm);
    if (!fs.existsSync(dir)) return kirim(res, 404, { error: 'RM ' + rm + ' belum ada di hub' });
    const riwayat = fs.readdirSync(dir).filter(f => /^handoff_\d/.test(f)).sort();
    audit({ aksi: 'lihat', ip, user: sesi.id, rm });
    return kirim(res, 200, {
      rm,
      intake: bacaJSON(path.join(dir, 'intake.json')),
      handoff_terakhir: bacaJSON(path.join(dir, 'handoff_terakhir.json')),
      handoff_terakhir_slimming: bacaJSON(path.join(dir, 'handoff_terakhir_slimming.json')),
      consent: daftarConsent(dir),
      jumlah_handoff: riwayat.length
    });
  }

  /* GET /api/audit?rm=... (admin) */
  if (req.method === 'GET' && parts[1] === 'audit') {
    if (!boleh('audit')) return tolak('audit');
    const rm = u.searchParams.get('rm');
    return kirim(res, 200, { audit: bacaAudit(rm ? r => r.rm === rm : null, +u.searchParams.get('n') || 200) });
  }

  /* pengguna (admin) */
  if (parts[1] === 'users') {
    if (!boleh('users')) return tolak('users');
    if (req.method === 'GET') return kirim(res, 200, { saya: sesi.id, users: (bacaUsers().users || []).map(x => ({ id: x.id, nama: x.nama, peran: x.peran, aktif: x.aktif !== false, dibuat: x.dibuat || null, diubah: x.diubah || null })) });
    /* POST: pengguna baru = {id,nama,peran,pin}; pengguna lama = {id} + kolom yang diubah (nama | peran | aktif | pin).
       Dipakai dashboard www/admin.html dan tools/pengguna.js setara. */
    return bodyJSON(req, o => {
      const id = String((o && o.id) || '').trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9._-]{1,23}$/.test(id)) return kirim(res, 400, { error: 'id: huruf kecil, angka, titik; 2–24 karakter' });
      if (o.pin !== undefined && !/^\d{4,8}$/.test(String(o.pin))) return kirim(res, 400, { error: 'PIN 4–8 digit' });
      if (o.peran !== undefined && !PERAN.includes(o.peran)) return kirim(res, 400, { error: 'peran: ' + PERAN.join('/') });
      const users = bacaUsers(); users.users = users.users || [];
      const ada = users.users.find(x => x.id === id);
      if (!ada) {
        if (!o.nama || !String(o.nama).trim() || !o.peran || o.pin === undefined) return kirim(res, 400, { error: 'pengguna baru butuh id, nama, peran (' + PERAN.join('/') + '), pin 4–8 digit' });
        buatUser(users, id, String(o.nama).trim(), o.peran, o.pin); tulisUsers(users);
        audit({ aksi: 'user_simpan', ip, user: sesi.id, detail: id + ' ' + o.peran });
        return kirim(res, 200, { ok: true, aksi: 'baru' });
      }
      const turun = (o.peran !== undefined && o.peran !== 'admin') || o.aktif === false;
      if (id === sesi.id && turun) return kirim(res, 400, { error: 'akun sendiri tidak bisa dinonaktifkan atau diturunkan perannya' });
      if (ada.peran === 'admin' && turun && !users.users.some(x => x.id !== id && x.peran === 'admin' && x.aktif !== false)) return kirim(res, 400, { error: 'tidak bisa: ini satu-satunya admin aktif' });
      const ubah = [];
      if (o.nama !== undefined && String(o.nama).trim()) { ada.nama = String(o.nama).trim(); ubah.push('nama'); }
      if (o.peran !== undefined && o.peran !== ada.peran) { ada.peran = o.peran; ubah.push('peran=' + o.peran); }
      if (o.aktif !== undefined && !!o.aktif !== (ada.aktif !== false)) { ada.aktif = !!o.aktif; ubah.push(ada.aktif ? 'aktif' : 'nonaktif'); }
      if (o.pin !== undefined) { ada.salt = crypto.randomBytes(8).toString('hex'); ada.hash = hashPin(o.pin, ada.salt); ubah.push('pin'); }
      if (!ubah.length) return kirim(res, 400, { error: 'tidak ada yang diubah' });
      ada.diubah = new Date().toISOString(); tulisUsers(users);
      /* peran / PIN / nonaktif berubah -> sesi lama pengguna itu ditutup (kecuali sesi yang sedang dipakai admin ini) */
      if (ubah.some(u => u !== 'nama')) { const tokIni = req.headers['x-adc-token']; for (const t of Object.keys(SESI)) if (SESI[t] && SESI[t].id === id && t !== tokIni) delete SESI[t]; simpanSesi(); }
      audit({ aksi: 'user_ubah', ip, user: sesi.id, detail: id + ' ' + ubah.join(',') });
      return kirim(res, 200, { ok: true, aksi: 'ubah', ubah });
    });
  }

  /* POST /api/intake | /api/handoff | /api/consent — body = JSON persis keluaran form */
  if (req.method === 'POST' && (parts[1] === 'intake' || parts[1] === 'handoff' || parts[1] === 'consent')) {
    const jenis = parts[1];
    if (!boleh(jenis)) return tolak(jenis);
    return bodyJSON(req, o => {
      if (!o) return kirim(res, 400, { error: 'JSON rusak' });
      const docOK = { intake: 'ADC-INTAKE', handoff: 'ADC-HANDOFF', consent: 'ADC-CONSENT' }[jenis];
      if (o.doc !== docOK) return kirim(res, 400, { error: 'doc bukan ' + docOK });
      const rm = aman(rmDari(o));
      if (!rm) return kirim(res, 400, { error: 'No. RM kosong — isi RM dulu di form' });
      const dir = dirRM(rm);
      fs.mkdirSync(dir, { recursive: true });
      /* stempel server: siapa menyimpan, kapan, dari mana (nama + waktu per Pasal 16 ayat 2) */
      o._audit = { oleh: sesi.id, nama: sesi.nama, peran: sesi.peran, waktu: new Date().toISOString(), ip };
      if (jenis === 'intake') {
        const lama = path.join(dir, 'intake.json'), adaLama = fs.existsSync(lama);
        if (adaLama) {
          /* koreksi: boleh dalam 2x24 jam; lewat itu hanya admin (Pasal 30 ayat 6–7) */
          const sebelumnya = bacaJSON(lama) || {};
          const t0 = new Date((sebelumnya._audit && sebelumnya._audit.waktu) || sebelumnya.diterbitkan || 0).getTime();
          if (t0 && Date.now() - t0 > KOREKSI_MS && !boleh('koreksi_lama')) {
            audit({ aksi: 'intake_tolak_koreksi', ip, user: sesi.id, rm });
            return kirim(res, 403, { error: 'Form 1 pasien ini sudah lebih dari 2x24 jam — perbaikan harus oleh admin (pimpinan). Hubungi PJ klinik.' });
          }
          fs.copyFileSync(lama, path.join(dir, 'intake_' + stampe() + '.json'));
          o._audit.koreksi_dari = sebelumnya._audit || null;
        }
        tulisJSON(lama, o);
        audit({ aksi: adaLama ? 'intake_koreksi' : 'intake', ip, user: sesi.id, rm });
      } else if (jenis === 'handoff') {
        if (o.penerbitan && o.penerbitan.ttd) o._audit.ttd_valid = cekTTD(o.penerbitan.ttd);
        const slim = /^ADC-SLIMMING/i.test(o.sumber || '');
        tulisJSON(path.join(dir, (slim ? 'handoffslim_' : 'handoff_') + stampe() + '.json'), o);
        tulisJSON(path.join(dir, slim ? 'handoff_terakhir_slimming.json' : 'handoff_terakhir.json'), o);
        audit({ aksi: 'handoff', ip, user: sesi.id, rm, detail: (slim ? 'slimming' : 'skin') + (o._audit.ttd_valid === false ? ' TTD-TIDAK-VALID' : o._audit.ttd_valid ? ' ttd ' + o.penerbitan.ttd.id : ' tanpa ttd') });
      } else {
        const no = String(o.no || ('IC-' + rm + '-' + stampe().slice(0, 16))).replace(/[^A-Za-z0-9_.-]/g, '_');
        o.no = no;
        tulisJSON(path.join(dir, 'consent_' + no + '.json'), o);
        audit({ aksi: 'consent', ip, user: sesi.id, rm, detail: no });
      }
      return kirim(res, 200, { ok: true, rm, jenis, no: o.no, audit: o._audit });
    });
  }

  return kirim(res, 404, { error: 'rute tidak dikenal' });
};

/* ---- HTTPS bila sertifikat ada (tools/buat-sertifikat.ps1), kalau tidak HTTP ---- */
let server, skema = 'http';
const pfxPath = path.join(ROOT, (CFG.tls && CFG.tls.pfx) || 'hub.pfx');
if (fs.existsSync(pfxPath)) {
  try { server = https.createServer({ pfx: fs.readFileSync(pfxPath), passphrase: (CFG.tls && CFG.tls.passphrase) || '' }, handler); skema = 'https'; }
  catch (e) { console.error('Sertifikat hub.pfx tidak bisa dipakai (' + e.message + ') — jalan di HTTP'); }
}
if (!server) server = http.createServer(handler);

server.listen(CFG.port, () => {
  console.log('==============================================');
  console.log(' ADC HUB berjalan  (' + skema.toUpperCase() + (skema === 'http' ? ' — tanpa sertifikat; lihat tools/buat-sertifikat.ps1' : '') + ')');
  console.log('   URL   : ' + skema + '://localhost:' + CFG.port);
  console.log('   Kunci : ' + CFG.key + '   (config.json)');
  console.log('   Data  : ' + DATA + '  (terenkripsi; jangan hilangkan config.json)');
  console.log('   Backup: ' + (CFG.backup_dir ? CFG.backup_dir + ' tiap ' + CFG.backup_jam + ' jam' : 'BELUM DIATUR — isi backup_dir di config.json'));
  console.log('   NeoSoft: ' + (neoAktif() ? (NEO.mock ? 'MOCK (uji) — ' + Object.keys(NEO.mock).length + ' RM' : 'baca identitas by RM dari ' + NEO.host) : 'tidak dikonfigurasi (opsional; lihat neosoft.json.example)'));
  console.log('   Form  : ' + skema + '://localhost:' + CFG.port + '/   (dari tablet: ' + skema + '://IP-PC-ini:' + CFG.port + '/)');
  console.log(' Biarkan jendela ini terbuka selama klinik buka.');
  console.log('==============================================');
  if (CFG.backup_dir) { backup('saat mulai'); setInterval(() => backup('berkala'), Math.max(1, +CFG.backup_jam || 6) * 3600 * 1000).unref(); }
});
